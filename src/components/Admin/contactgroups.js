// @flow
import * as React from 'react';
import { useContext, useState, useEffect, useRef } from 'react';
import { Container, Row, Col } from 'reactstrap';
import { Table, Modal, Button, Form, Input, Tooltip, Icon, notification, Spin } from 'antd';
import moment from 'moment';
import Highlighter from 'react-highlight-words';
import { contactActions } from '../../modules/Contact';
import { contactGroupActions } from '../../modules/ContactGroups';
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

const ContactGroupsAdminForm = props => {

	let { store, dispatch } = useContext(AppContext);
	const { form } = props;
	const { getFieldDecorator } = form;

	const [loadingGlobal, setLoadingGlobal] = useState(false);
	const [loadingContactGroups, setLoadingContactGroups] = useState(false);
	const [showingEditModal, setShowingEditModal] = useState(false);
	const [editSubmitting, setEditSubmitting] = useState(false);
	const [contactGroupIdEditing, setContactGroupIdEditing] = useState(-1);
	const [newContactGroup, setNewContactGroup] = useState(null);
	const [contactGroupIdInlineEditing, setContactGroupIdInlineEditing] = useState('');
	const [copyId, setCopyId] = useState(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [searchText, setSearchText] = useState(null);
	const pageSize = 10;

	notification.config({ placement: 'bottomRight' });

	const getContactGroups = () => {
		setLoadingContactGroups(true);
		contactGroupActions.getContactGroups().then((response) => {
			setLoadingContactGroups(false);
			if (response && response.data && response.data.data) {
				dispatch({type:'UPDATE_CONTACTGROUPS', payload: response.data.data.map((data, i) => { return { ...data, no: i + 1 } })});
			} else {
				notification['error']({
					message: 'Error',
					description: response.data.msg ? response.data.msg : 'Failed to add contactgroup data!',
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

	const reloadContacts = () => {
		contactActions.getContacts().then((response) => {
			if (response && response.data && response.data.data) {
				dispatch({type:'UPDATE_CONTACTS', payload: response.data.data.map((data, i) => { return { ...data, no: i + 1 } })});
			} else {
				console.error(response.data.msg ? response.data.msg : 'Failed to add contact data!');
			}
		});
	}

	const deleteContactGroup = (contactGroupId) => {
		const contactGroup = store.contactGroups.find(obj => obj.id == contactGroupId);
		setLoadingGlobal(true);
		contactGroupActions.deleteContactGroup(contactGroupId).then((response) => {
			setLoadingGlobal(false);
			if (response.data.error && response.data.error === true) {
				notification['error']({
					message: 'Error!',
					description: response.data.msg ? response.data.msg : `Failed to delete "${contactGroup.contactgroup_name}" contactgroup!`,
				});
			} else {
				notification['success']({
					message: 'Success',
					description: `Succeed to delete "${contactGroup.contactgroup_name}" contactgroup.`,
				});
				getContactGroups();
				reloadContacts();
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
				if (contactGroupIdEditing && contactGroupIdEditing > 0) {
					const data = { ...values, id: contactGroupIdEditing };
					contactGroupActions.updateContactGroup(data).then((response) => {
						setEditSubmitting(false);
						if (response.data.error && response.data.error === true) {
							notification['error']({
								message: 'Error',
								description: response.data.msg ? response.data.msg : 'Failed to add contactgroup data!',
							});
						} else {
							notification['success']({
								message: 'Success',
								description: 'Succeed to update contactgroup data.',
							});
							setContactGroupIdEditing(-1);
							setShowingEditModal(false);
							getContactGroups();
							reloadContacts();
						}
					})
						.catch(function (error) {
							notification['error']({
								message: 'Error!',
								description: error.message,
							});
						});
				} else {
					contactGroupActions.addContactGroup(values).then((response) => {
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
							setContactGroupIdEditing(-1);
							setShowingEditModal(false);
							getContactGroups();
							reloadContacts();
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

	const handleEdit = (contactGroupId) => {
		setContactGroupIdEditing(contactGroupId);
	};

	const handleAdd = () => {
		setContactGroupIdEditing(0);
		form.setFieldsValue({
			'contactgroup_name': '',
			'alias': '',
		});
	};

	const handleDelete = (contactGroupId) => {
		const contactGroup = store.contactGroups.find(obj => obj.id == contactGroupId);
		Modal.confirm({
			title: `Are you sure delete "${contactGroup.contactgroup_name}" contactgroup?`,
			okText: 'Yes',
			okType: 'danger',
			cancelText: 'No',
			onOk: () => deleteContactGroup(contactGroupId),
		});
	};

	const showEditModal = () => {
		setShowingEditModal(true);
		if (contactGroupIdEditing && contactGroupIdEditing > 0) {
			const contactGroup = store.contactGroups.find(obj => obj.id == contactGroupIdEditing);
			form.setFieldsValue({
				...contactGroup,
				added_time: moment(contactGroup.added_time).format(dateFormat),
				modified_time: moment(contactGroup.modified_time).format(dateFormat)
			});
		}
	};

	useEffect(() => {
		getContactGroups();
	}, []);

	useEffect(() => {
		if(contactGroupIdEditing >= 0) {
			showEditModal();
		}
	}, [contactGroupIdEditing]);

	const handleCancel = () => {
		setContactGroupIdEditing(-1);
		setShowingEditModal(false);
	};

	const handleCopy = (contactGroupId) => {
		const contactGroup = store.contactGroups.find(obj => obj.id == contactGroupId);
		const rowVal = {
			...contactGroup, 
			contactgroup_name: `Copy of ${contactGroup.contactgroup_name}`
		}
		setNewContactGroup({ 
			...rowVal, 
			id: -1 
		});
		setContactGroupIdInlineEditing(-1);
		setCopyId(contactGroup.id);
		form.setFieldsValue({
			...rowVal,
		});
	};

	const handleSave = (form, key) => {
    form.validateFields((error, row) => {
			if (error && 'contactgroup_name' in error) {
        return;
			}
			const contactGroup = store.contactGroups.find(obj => obj.id == copyId);
			const data = {
				...contactGroup,
				...row
			}
			setLoadingGlobal(true);
			contactGroupActions.addContactGroup(data).then((response) => {
				setLoadingGlobal(false);
				if (response.data.error && response.data.error === true) {
					notification['error']({
						message: 'Error',
						description: response.data.msg ? response.data.msg : 'Failed to add contact group data!',
					});
				} else {
					notification['success']({
						message: 'Success',
						description:
							'Succeed to add contact group data.',
					});
					setNewContactGroup(null)
					setContactGroupIdInlineEditing('');
					setCopyId(null);
					getContactGroups();
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
		setNewContactGroup(null)
		setContactGroupIdInlineEditing('');
		setCopyId(null);
  };

	const onPageChange = (page, pageSize) => {
		setCurrentPage(page);
	}

	const isEditing = record => record.id === contactGroupIdInlineEditing;

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
			dataIndex: 'contactgroup_name',
			editable: true,
			className: 'textCenter',
			width: 300,
			key: 'contactgroup_name',
			rules: [{ required: true, message: 'Please input Name!' }],
			...getColumnSearchProps('contact_name'),
			sorter: stringSorter('contact_name')
		},
		{
			title: 'Alias',
			dataIndex: 'alias',
			editable: true,
			className: 'textCenter',
			width: 300,
			key: 'alias',
			...getColumnSearchProps('alias'),
			sorter: stringSorter('alias')
		},
		{
			title: 'Members',
			dataIndex: 'members',
			className: 'textCenter',
			key: 'members',
			...getColumnSearchProps('members'),
			sorter: stringSorter('members')
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
						<Button type="primary" style={{ ...buttonStyle, marginRight: 10 }} disabled={contactGroupIdInlineEditing !== ''} onClick={() => handleEdit(record.id)} >
							<Icon type="edit" style={navIconStyle} />Edit</Button>
						<Button type="secondary" style={{ ...buttonStyle, marginRight: 10 }} disabled={contactGroupIdInlineEditing !== ''} onClick={() => handleCopy(record.id)} >
							<Icon type="copy" style={navIconStyle} />Copy</Button>
						<Button style={{ ...buttonStyle }} disabled={contactGroupIdInlineEditing !== ''} onClick={() => handleDelete(record.id)} >
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
						<Button type="primary" style={{ ...buttonStyle, float: "right", marginBottom: 10 }} onClick={handleAdd} disabled={contactGroupIdInlineEditing !== ''}>
							<Icon type="plus" style={navIconStyle} />Add New Contact Group
					</Button>
						<EditableContext.Provider value={form}>
							<Table
								components={components}
								columns={columns}
								dataSource={newContactGroup ? [...store.contactGroups.slice(0, pageSize * (currentPage - 1)), newContactGroup, ...store.contactGroups.slice(pageSize * (currentPage - 1))] : store.contactGroups}
								bordered
								size='small'
								pagination={{ position: 'both', onChange: onPageChange }}
								loading={loadingContactGroups}
								rowKey="id"
							/>
						</EditableContext.Provider>
						
						<Modal
							visible={showingEditModal}
							title={contactGroupIdEditing && contactGroupIdEditing > 0 ? "Edit ContactGroup" : "Add New ContactGroup"}
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
									{getFieldDecorator('contactgroup_name', {
										rules: columns.find(c => c.dataIndex === 'contactgroup_name').rules,
									})(<Input disabled={contactGroupIdEditing && contactGroupIdEditing > 0} />)}
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
								{contactGroupIdEditing && contactGroupIdEditing > 0 ? (
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

export default Form.create({ name: 'ContactGroupsAdminForm' })(ContactGroupsAdminForm);