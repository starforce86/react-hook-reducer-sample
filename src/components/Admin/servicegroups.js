// @flow
import * as React from 'react';
import { useContext, useState, useEffect, useRef } from 'react';
import { Container, Row, Col } from 'reactstrap';
import { Table, Modal, Button, Form, Input, Tooltip, Icon, notification, Spin } from 'antd';
import moment from 'moment';
import Highlighter from 'react-highlight-words';
import { serviceActions } from '../../modules/Services';
import { serviceGroupActions } from '../../modules/ServiceGroups';
import { AppContext } from '../../App';

const dateFormat = 'MM/DD/YYYY hh:mm A';

const EditableContext = React.createContext();

class EditableCell extends React.Component {

  getInput = () => {
		const {
      editing,
      dataIndex,
      title,
      inputType,
      record,
			index,
			items,
      children,
      ...restProps
		} = this.props;
    if (this.props.inputType === 'number') {
      return <InputNumber />;
    } else if(this.props.inputType === 'select') {
			return (
				<Select style={{ minWidth: 100, width: '100%' }}>
					{items.map((d, i) => <Select.Option value={d} key={i}>{d}</Select.Option>)}
				</Select>
			)
		} else if(this.props.inputType === 'multiselect') {
			return (
				<Select mode="multiple" placeholder={`Please Select ${title}!`} style={{ minWidth: 100, width: '100%' }}>
					{items.map((d, i) => <Select.Option value={d} key={i}>{d}</Select.Option>)}
				</Select>
			)
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
			rules,
      children,
      ...restProps
    } = this.props;
    return (
      <td {...restProps}>
        {editing ? (
          <Form.Item style={{ margin: 0 }}>
            {getFieldDecorator(dataIndex, {
              rules,
              initialValue: inputType === 'multiselect' ? (record[dataIndex] ? record[dataIndex].split(',') : []) : record[dataIndex],
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

const ServiceGroupsAdminForm = props => {

	let { store, dispatch } = useContext(AppContext);
	const { form } = props;
	const { getFieldDecorator } = form;

	const [loadingGlobal, setLoadingGlobal] = useState(false);
	const [loadingServiceGroups, setLoadingServiceGroups] = useState(false);
	const [showingEditModal, setShowingEditModal] = useState(false);
	const [editSubmitting, setEditSubmitting] = useState(false);
	const [serviceGroupIdEditing, setServiceGroupIdEditing] = useState(-1);
	const [newServiceGroup, setNewServiceGroup] = useState(null);
	const [serviceGroupIdInlineEditing, setServiceGroupIdInlineEditing] = useState('');
	const [copyId, setCopyId] = useState(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [searchText, setSearchText] = useState(null);
	const pageSize = 10;

	notification.config({ placement: 'bottomRight' });

	const getServiceGroups = () => {
		setLoadingServiceGroups(true);
		serviceGroupActions.getServiceGroups().then((response) => {
			setLoadingServiceGroups(false);
			if (response && response.data && response.data.data) {
				dispatch({type:'UPDATE_SERVICEGROUPS', payload: response.data.data.map((data, i) => { return { ...data, no: i + 1 } })});
			} else {
				notification['error']({
					message: 'Error',
					description: response.data.msg ? response.data.msg : 'Failed to add servicegroup data!',
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

	const reloadServices = () => {
		serviceActions.getServices().then((response) => {
			if (response && response.data && response.data.data) {
				dispatch({type:'UPDATE_SERVICES', payload: response.data.data.map((data, i) => { return { ...data, no: i + 1 } })});
			} else {
				console.error(response.data.msg ? response.data.msg : 'Failed to add service data!');
			}
		});
	}

	const deleteServiceGroup = (serviceGroupId) => {
		const serviceGroup = store.serviceGroups.find(obj => obj.id == serviceGroupId);
		setLoadingGlobal(true);
		serviceGroupActions.deleteServiceGroup(serviceGroupId).then((response) => {
			setLoadingGlobal(false);
			if (response.data.error && response.data.error === true) {
				notification['error']({
					message: 'Error!',
					description: response.data.msg ? response.data.msg : `Failed to delete "${serviceGroup.servicegroup_name}" servicegroup!`,
				});
			} else {
				notification['success']({
					message: 'Success',
					description: `Succeed to delete "${serviceGroup.servicegroup_name}" servicegroup.`,
				});
				getServiceGroups();
				reloadServices();
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
				if (serviceGroupIdEditing && serviceGroupIdEditing > 0) {
					const data = { ...values, id: serviceGroupIdEditing };
					serviceGroupActions.updateServiceGroup(data).then((response) => {
						setEditSubmitting(false);
						if (response.data.error && response.data.error === true) {
							notification['error']({
								message: 'Error',
								description: response.data.msg ? response.data.msg : 'Failed to add servicegroup data!',
							});
						} else {
							notification['success']({
								message: 'Success',
								description: 'Succeed to update servicegroup data.',
							});
							setServiceGroupIdEditing(-1);
							setShowingEditModal(false);
							getServiceGroups();
							reloadServices();
						}
					})
						.catch(function (error) {
							notification['error']({
								message: 'Error!',
								description: error.message,
							});
						});
				} else {
					serviceGroupActions.addServiceGroup(values).then((response) => {
						setEditSubmitting(false);
						if (response.data.error && response.data.error === true) {
							notification['error']({
								message: 'Error!',
								description: response.data.msg ? response.data.msg : 'Failed to add contactgroup data!',
							});
						} else {
							notification['success']({
								message: 'Success',
								description: 'Succeed to add contactgroup data.',
							});
							setServiceGroupIdEditing(-1);
							setShowingEditModal(false);
							getServiceGroups();
							reloadServices();
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

	const handleEdit = (serviceGroupId) => {
		setServiceGroupIdEditing(serviceGroupId);
	};

	const handleAdd = () => {
		setServiceGroupIdEditing(0);
		form.setFieldsValue({
			'servicegroup_name': '',
			'alias': '',
		});
	};

	const handleDelete = (serviceGroupId) => {
		const serviceGroup = store.serviceGroups.find(obj => obj.id == serviceGroupId);
		Modal.confirm({
			title: `Are you sure delete "${serviceGroup.servicegroup_name}" servicegroup?`,
			okText: 'Yes',
			okType: 'danger',
			cancelText: 'No',
			onOk: () => deleteServiceGroup(serviceGroupId),
		});
	};

	const showEditModal = () => {
		setShowingEditModal(true);
		if (serviceGroupIdEditing && serviceGroupIdEditing > 0) {
			const serviceGroup = store.serviceGroups.find(obj => obj.id == serviceGroupIdEditing);
			form.setFieldsValue({
				...serviceGroup,
				added_time: moment(serviceGroup.added_time).format(dateFormat),
				modified_time: moment(serviceGroup.modified_time).format(dateFormat)
			});
		}
	};

	useEffect(() => {
		getServiceGroups();
	}, []);

	useEffect(() => {
		if(serviceGroupIdEditing >= 0) {
			showEditModal();
		}
	}, [serviceGroupIdEditing]);

	const handleCancel = () => {
		setServiceGroupIdEditing(-1);
		setShowingEditModal(false);
	};

	const handleCopy = (serviceGroupId) => {
		const serviceGroup = store.serviceGroups.find(obj => obj.id == serviceGroupId);
		const rowVal = {
			...serviceGroup, 
			servicegroup_name: `Copy of ${serviceGroup.servicegroup_name}`, 
		}
		setNewServiceGroup({ 
			...rowVal, 
			id: -1 
		});
		setServiceGroupIdInlineEditing(-1);
		setCopyId(serviceGroup.id);
		form.setFieldsValue({
			...rowVal,
		});
	};

	const handleSave = (form, key) => {
    form.validateFields((error, row) => {
			if (error && 'servicegroup_name' in error) {
        return;
			}
			const serviceGroup = store.serviceGroups.find(obj => obj.id == copyId);
			const data = {
				...serviceGroup,
				servicegroup_name: row.servicegroup_name,
				alias: row.alias,
				servicegroups_members: [],
				members: [],
			}
			setLoadingGlobal(true);
			serviceGroupActions.addServiceGroup(data).then((response) => {
				setLoadingGlobal(false);
				if (response.data.error && response.data.error === true) {
					notification['error']({
						message: 'Error',
						description: response.data.msg ? response.data.msg : 'Failed to add service group data!',
					});
				} else {
					notification['success']({
						message: 'Success',
						description:
							'Succeed to add service group data.',
					});
					setNewServiceGroup(null)
					setServiceGroupIdInlineEditing('');
					setCopyId(null);
					getServiceGroups();
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
		setNewServiceGroup(null)
		setServiceGroupIdInlineEditing('');
		setCopyId(null);
  };

	const onPageChange = (page, pageSize) => {
		setCurrentPage(page);
	}

	const isEditing = record => record.id === serviceGroupIdInlineEditing;

	const handleSearch = (selectedKeys, confirm) => {
    confirm();
		setSearchText(selectedKeys[0]);
  };

  const handleReset = clearFilters => {
		clearFilters();
		setSearchText('');
	};

	const searchInputRef = useRef();
	
	const getColumnSearchProps = dataIndex => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Input
          ref={searchInputRef}
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => handleSearch(selectedKeys, confirm)}
          style={{ width: 188, marginBottom: 8, display: 'block' }}
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
			title: 'Name',
			dataIndex: 'servicegroup_name',
			editable: true,
			className: 'textCenter',
			key: 'servicegroup_name',
			rules: [{ required: true, message: 'Please input Service Group Name!' }],
			...getColumnSearchProps('servicegroup_name'),
			sorter: stringSorter('servicegroup_name')
		},
		{
			title: 'Alias',
			dataIndex: 'alias',
			editable: true,
			className: 'textCenter',
			key: 'alias',
			...getColumnSearchProps('alias'),
			sorter: stringSorter('alias')
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
						<Button type="primary" style={{ ...buttonStyle, marginRight: 10 }} disabled={serviceGroupIdInlineEditing !== ''} onClick={() => handleEdit(record.id)} >
							<Icon type="edit" style={navIconStyle} />Edit</Button>
						<Button type="secondary" style={{ ...buttonStyle, marginRight: 10 }} disabled={serviceGroupIdInlineEditing !== ''} onClick={() => handleCopy(record.id)} >
							<Icon type="copy" style={navIconStyle} />Copy</Button>
						<Button style={{ ...buttonStyle }} disabled={serviceGroupIdInlineEditing !== ''} onClick={() => handleDelete(record.id)} >
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
					<Col md={{ size: 10, offset: 1 }}>
						<br />
						<Button type="primary" style={{ ...buttonStyle, float: "right", marginBottom: 10 }} onClick={handleAdd} disabled={serviceGroupIdInlineEditing !== ''}>
							<Icon type="plus" style={navIconStyle} />Add New Service Group
						</Button>
						<EditableContext.Provider value={form}>
							<Table
								components={components}
								columns={columns}
								dataSource={newServiceGroup ? [...store.serviceGroups.slice(0, pageSize * (currentPage - 1)), newServiceGroup, ...store.serviceGroups.slice(pageSize * (currentPage - 1))] : store.serviceGroups}
								bordered
								size='small'
								pagination={{ position: 'both', onChange: onPageChange }}
								loading={loadingServiceGroups}
								rowKey="id"
							/>
						</EditableContext.Provider>
						
						<Modal
							visible={showingEditModal}
							title={serviceGroupIdEditing && serviceGroupIdEditing > 0 ? "Edit ServiceGroup" : "Add New ServiceGroup"}
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
							<Form labelCol={{ span: 8 }} wrapperCol={{ span: 16 }} labelAlign="left" onSubmit={handleOk}>
								<Form.Item label="Name">
									{getFieldDecorator('servicegroup_name', {
										rules: columns.find(c => c.dataIndex === 'servicegroup_name').rules,
									})(<Input disabled={serviceGroupIdEditing && serviceGroupIdEditing > 0} />)}
								</Form.Item>
								<Form.Item label={
									<span>
										Alias&nbsp;
								<Tooltip title="What do you want others to call you?">
											<Icon type="question-circle-o" />
										</Tooltip>
									</span>
								}>
									{getFieldDecorator('alias', {
										rules: columns.find(c => c.dataIndex === 'alias').rules,
									})(<Input />)}
								</Form.Item>
								{serviceGroupIdEditing && serviceGroupIdEditing > 0 ? (
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

export default Form.create({ name: 'ServiceGroupsAdminForm' })(ServiceGroupsAdminForm);