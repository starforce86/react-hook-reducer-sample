// @flow
import * as React from 'react';
import { useContext, useState, useEffect, useRef } from 'react';
import { Container, Row, Col } from 'reactstrap';
import { Table, Modal, Button, Form, Input, Tooltip, Icon, notification, Spin } from 'antd';
import moment from 'moment';
import Highlighter from 'react-highlight-words';
import { commandActions } from '../../modules/Commands';
import { AppContext } from '../../App';

const dateFormat = 'MM/DD/YYYY hh:mm A';
const custom_commandname_prefix = "custom_";

const EditableContext = React.createContext();

class EditableCell extends React.Component {

  getInput = () => {
    if (this.props.inputType === 'number') {
      return <InputNumber />;
    }
    return <Input />;
  };

  renderCell = ({ getFieldDecorator }) => {
    const {
      editing,
      dataIndex,
      title,
      inputType,
      record,
      index,
      children,
      ...restProps
    } = this.props;
    return (
      <td {...restProps}>
        {editing ? (
          <Form.Item style={{ margin: 0 }}>
            {getFieldDecorator(dataIndex, {
              rules: [
                {
                  required: true,
                  message: `Please Input ${title}!`,
                },
              ],
              initialValue: record[dataIndex],
            })(this.getInput())}
          </Form.Item>
        ) : (
          children
        )}
      </td>
    );
  };

  render() {
    return <EditableContext.Consumer>{this.renderCell}</EditableContext.Consumer>;
  }
}

const CommandsAdminForm = props => {

	let { store, dispatch } = useContext(AppContext);
	const { form } = props;
	const { getFieldDecorator } = form;

	const [loadingGlobal, setLoadingGlobal] = useState(false);
	const [loadingCommands, setLoadingCommands] = useState(false);
	const [showingEditModal, setShowingEditModal] = useState(false);
	const [editSubmitting, setEditSubmitting] = useState(false);
	const [commandIdEditing, setCommandIdEditing] = useState(-1);
	const [newCommand, setNewCommand] = useState(null);
	const [commandIdInlineEditing, setCommandIdInlineEditing] = useState('');
	const [copyId, setCopyId] = useState(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [searchText, setSearchText] = useState(null);
	const pageSize = 10;

	notification.config({ placement: 'bottomRight' });

	const getCommands = () => {
		setLoadingCommands(true);
		commandActions.getCommands().then((response) => {
			setLoadingCommands(false);
			if (response && response.data && response.data.data) {
				dispatch({type:'UPDATE_COMMANDS', payload: response.data.data.map((data, i) => { return { ...data, no: i + 1 } })});
			} else {
				notification['error']({
					message: 'Error',
					description: response.data.msg ? response.data.msg : 'Failed to get commands data from server!',
				});
			}
		})
			.catch(function (error) {
				notification['error']({
					message: 'Error!',
					description: error.message,
				});
			});
	}

	const deleteCommand = (id) => {
		const command = store.commands.find(obj => obj.id == id);
		setLoadingGlobal(true);
		commandActions.deleteCommand(id).then((response) => {
			setLoadingGlobal(false);
			if (response.data.error && response.data.error === true) {
				notification['error']({
					message: 'Error!',
					description: response.data.msg ? response.data.msg : `Failed to delete "${command.command_name}" command!`,
				});
			} else {
				notification['success']({
					message: 'Success',
					description: `Succeed to delete "${command.command_name}" command.`,
				});
				getCommands();
			}
		})
			.catch(function (error) {
				notification['error']({
					message: 'Error!',
					description: error.message,
				});
			});
	}

	const handleOk = (e) => {
		e.preventDefault();
		form.validateFieldsAndScroll((err, values) => {
			if (!err) {
				setEditSubmitting(true);
				if (commandIdEditing && commandIdEditing > 0) {
					const data = { ...values, id: commandIdEditing };
					commandActions.updateCommand(data).then((response) => {
						setEditSubmitting(false);
						if (response.data.error && response.data.error === true) {
							notification['error']({
								message: 'Error',
								description: response.data.msg ? response.data.msg : 'Failed to update command data!',
							});
						} else {
							notification['success']({
								message: 'Success',
								description: 'Succeed to update command data.',
							});
							setCommandIdEditing(-1);
							setShowingEditModal(false);
							getCommands();
						}
					})
						.catch(function (error) {
							notification['error']({
								message: 'Error!',
								description: error.message,
							});
						});
				} else {
					commandActions.addCommand(values).then((response) => {
						setEditSubmitting(false);
						if (response.data.error && response.data.error === true) {
							notification['error']({
								message: 'Error!',
								description: response.data.msg ? response.data.msg : 'Failed to add command data!',
							});
						} else {
							notification['success']({
								message: 'Success',
								description: 'Succeed to add command data.',
							});
							setCommandIdEditing(-1);
							setShowingEditModal(false);
							getCommands();
						}
					})
						.catch(function (error) {
							notification['error']({
								message: 'Error!',
								description: error.message,
							});
						});
				}
			}
		});
	};

	const handleEdit = (id) => {
		setCommandIdEditing(id);
	};

	const handleAdd = () => {
		setCommandIdEditing(0);
	};

	const handleDelete = (id) => {
		const command = store.commands.find(obj => obj.id == id);
		Modal.confirm({
			title: `Are you sure delete "${command.command_name}" command?`,
			okText: 'Yes',
			okType: 'danger',
			cancelText: 'No',
			onOk: () => deleteCommand(id),
		});
	};

	const showEditModal = () => {
		setShowingEditModal(true);
		if (commandIdEditing && commandIdEditing > 0) {
			const command = store.commands.find(obj => obj.id == commandIdEditing);
			form.setFieldsValue({
				...command,
				added_time: moment(command.added_time).format(dateFormat),
				modified_time: moment(command.modified_time).format(dateFormat)
			});
		} else {
			form.setFieldsValue({
				command_name: '',
				command_line: '',
			});
		}
	};

	useEffect(() => {
		getCommands();
	}, []);

	useEffect(() => {
		if(commandIdEditing >= 0) {
			showEditModal();
		}
	}, [commandIdEditing]);

	const handleCancel = () => {
		setCommandIdEditing(-1);
		setShowingEditModal(false);
	};

	const handleCopy = (commandId) => {
		const command = store.commands.find(obj => obj.id == commandId);
		const rowVal = {
			...command, 
			command_name: `Copy of ${command.command_name}`, 
		}
		setNewCommand({ 
			...rowVal, 
			id: -1 
		});
		setCommandIdInlineEditing(-1);
		setCopyId(command.id);
		form.setFieldsValue({
			...rowVal,
		});
	};

	const handleSave = (form, key) => {
    form.validateFields((error, row) => {
			if (error && 'command_name' in error) {
        return;
			}
			const command = store.commands.find(obj => obj.id == copyId);
			const data = {
				...command,
				command_name: row.command_name,
			}
			setLoadingGlobal(true);
			commandActions.addCommand(data).then((response) => {
				setLoadingGlobal(false);
				if (response.data.error && response.data.error === true) {
					notification['error']({
						message: 'Error',
						description: response.data.msg ? response.data.msg : 'Failed to add command data!',
					});
				} else {
					notification['success']({
						message: 'Success',
						description:
							'Succeed to add command data.',
					});
					setNewCommand(null)
					setCommandIdInlineEditing('');
					setCopyId(null);
					getCommands();
				}
			})
				.catch(function (error) {
					setLoadingGlobal(false);
					notification['error']({
						message: 'Error!',
						description: error.message,
					});
				});
    });
  }

	const handleRowCancel = () => {
		setNewCommand(null)
		setCommandIdInlineEditing('');
		setCopyId(null);
  };

	const onPageChange = (page, pageSize) => {
		setCurrentPage(page);
	}

	const isEditing = record => record.id === commandIdInlineEditing;

	const handleSearch = (selectedKeys, confirm) => {
    confirm();
		setSearchText(selectedKeys[0]);
  };

  const handleReset = clearFilters => {
		clearFilters();
		setSearchText('');
	};

	const searchInputRef = useRef();
	
	const getColumnSearchProps = (dataIndex, inputWidth) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Input
          ref={searchInputRef}
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => handleSearch(selectedKeys, confirm)}
          style={{ width: inputWidth, marginBottom: 8, display: 'block' }}
        />
        <Button
          type="primary"
          onClick={() => handleSearch(selectedKeys, confirm)}
          icon="search"
          size="small"
          style={{ width: 90, marginRight: 8 }}
        >
          Search
        </Button>
        <Button onClick={() => handleReset(clearFilters)} size="small" style={{ width: 90 }}>
          Reset
        </Button>
      </div>
    ),
    filterIcon: filtered => (
      <Icon type="search" style={{ color: filtered ? '#1890ff' : undefined }} />
    ),
    onFilter: (value, record) =>
			record[dataIndex] ? record[dataIndex]
				.toString()
				.toLowerCase()
				.includes(value.toLowerCase()) : false,
    onFilterDropdownVisibleChange: visible => {
      if (visible) {
        setTimeout(() => searchInputRef.current.select());
      }
    },
    render: text => (
      <Highlighter
        highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
        searchWords={[searchText]}
        autoEscape
        textToHighlight={text ? text.toString() : text}
      />
    ),
	});
	
	const stringSorter = (key) => (a, b) => {
		if(a[key] < b[key]) { return -1; }
    if(a[key] > b[key]) { return 1; }
    return 0;
	}

	const getColumnFilterProps = (multiple, options, dataIndex) => ({
		filters: options.map(d => ({ text: d, value: d })),
		onFilter: (value, record) => {
			if (multiple) {
				if (!record[dataIndex]) {
					return false;
				}
				return record[dataIndex].split(',').find(d => d == value);
			} else {
				return record[dataIndex].indexOf(value) === 0;
			}
		}
	})

	let columns = [
		{
			title: 'No',
			dataIndex: 'no',
			className: 'textCenter',
			width: 60,
			key: 'id'
		},
		{
			title: 'Command Name',
			dataIndex: 'command_name',
			editable: true,
			className: 'textCenter',
			width: 300,
			key: 'command_name',
			rules: [
				{ required: true, message: 'Please input Command Name!' },
				{ max: 240, message: 'Command Name must be less than max length of 240!' },
			],
			...getColumnSearchProps('command_name', 250),
			sorter: stringSorter('command_name')
		},
		{
			title: 'Command Line',
			dataIndex: 'command_line',
			editable: true,
			className: 'textCenter',
			key: 'command_line',
			rules: [
				{ required: true, message: 'Please input Command Line!' },
				{ max: 65530, message: 'Command Line must be less than max length of 65530!' }
			],
			...getColumnSearchProps('command_line', 800),
			sorter: stringSorter('command_line')
		},
		{
			title: 'Actions', dataIndex: '', className: 'textCenter', width: 300, render: (text, record) => {
				const editable = isEditing(record);
				return editable ? (
					<span>
						<EditableContext.Consumer>
							{form => (
								<Button type="primary" style={{ ...buttonStyle, marginRight: 10 }} onClick={() => handleSave(form, record.id)} >
								<Icon type="save" style={navIconStyle} />Save</Button>
							)}
						</EditableContext.Consumer>
						<Button style={{ ...buttonStyle }} onClick={() => handleRowCancel(record.id)} >
							<Icon type="close" style={navIconStyle} />Cancel</Button>
					</span>
				) : (
					<div>
						<Button type="primary" style={{ ...buttonStyle, marginRight: 10 }} disabled={commandIdInlineEditing !== ''} onClick={() => handleEdit(record.id)} >
							<Icon type="edit" style={navIconStyle} />Edit</Button>
						<Button type="secondary" style={{ ...buttonStyle, marginRight: 10 }} disabled={commandIdInlineEditing !== ''} onClick={() => handleCopy(record.id)} >
							<Icon type="copy" style={navIconStyle} />Copy</Button>
						<Button style={{ ...buttonStyle }} disabled={commandIdInlineEditing !== ''} onClick={() => handleDelete(record.id)} >
							<Icon type="delete" style={navIconStyle} />Delete</Button>
					</div>
				);
			}
		}
	];

	columns = columns.map(col => {
		if (!col.editable) {
			return col;
		}
		return {
			...col,
			onCell: record => ({
				record,
				inputType: 'text',
				dataIndex: col.dataIndex,
				title: col.title,
				editing: isEditing(record),
				items: col.items,
				rules: col.rules,
			}),
		};
	});

	const buttonStyle = {};
	const navIconStyle = { verticalAlign: 2 }

	const components = {
		body: {
			cell: EditableCell,
		},
	};

	return (
		<Container fluid className="content">
			<Spin spinning={loadingGlobal}>
				<Row>
					<Col md="12">
						<br />
					</Col>
					<Col md={{ size: 12 }}>
						<br />
						<Button type="primary" style={{ ...buttonStyle, float: "right", marginBottom: 10 }} onClick={handleAdd} disabled={commandIdInlineEditing !== ''}>
							<Icon type="plus" style={navIconStyle} />Add New Command
						</Button>
						<EditableContext.Provider value={form}>
							<Table
								components={components}
								columns={columns}
								dataSource={newCommand ? [...store.commands.slice(0, pageSize * (currentPage - 1)), newCommand, ...store.commands.slice(pageSize * (currentPage - 1))] : store.commands}
								bordered
								size='small'
								pagination={{ position: 'both', onChange: onPageChange }}
								loading={loadingCommands}
								rowKey="id"
							/>
						</EditableContext.Provider>
					
						<Modal
							width={900}
							visible={showingEditModal}
							title={commandIdEditing && commandIdEditing > 0 ? "Edit Command" : "Add New Command"}
							onOk={handleOk}
							onCancel={handleCancel}
							footer={[
								<Button key="back" style={{ ...buttonStyle }} onClick={handleCancel}>
									Cancel
							</Button>,
								<Button key="submit" type="primary" style={{ ...buttonStyle }} loading={editSubmitting} onClick={handleOk}>
									Submit
							</Button>,
							]}
						>
							<Form labelCol={{ span: 4 }} wrapperCol={{ span: 20 }} labelAlign="left" onSubmit={handleOk}>
								<Form.Item label="Command Name">
									{getFieldDecorator('command_name', {
										rules: columns.find(c => c.dataIndex === 'command_name').rules,
									})(<Input disabled={commandIdEditing && commandIdEditing > 0} />)}
								</Form.Item>
								<Form.Item label="Command Line">
									{getFieldDecorator('command_line', {
										rules: columns.find(c => c.dataIndex === 'command_line').rules,
									})(<Input.TextArea autosize={{ minRows: 2 }} />)}
								</Form.Item>
								{commandIdEditing && commandIdEditing > 0 ? (
									<React.Fragment>
										<Form.Item label="Added Time">
											{getFieldDecorator('added_time', {
												rules: [],
											})(<Input disabled />)}
										</Form.Item>
										<Form.Item label="Modified Time">
											{getFieldDecorator('modified_time', {
												rules: [],
											})(<Input disabled />)}
										</Form.Item>
									</React.Fragment>
								) : ''}
							</Form>
						</Modal>
					</Col>
				</Row>
			</Spin>
		</Container>
	);
}

export default Form.create({ name: 'CommandsAdminForm' })(CommandsAdminForm);