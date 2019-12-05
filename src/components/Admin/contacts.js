// @flow
import * as React from 'react';
import { useContext, useState, useEffect, useRef } from 'react';
import { Container, Row, Col } from 'reactstrap';
import { Table, Modal, Button, Form, Input, Tooltip, Icon, notification, Switch, Checkbox, Select, Spin } from 'antd';
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

const ContactsAdminForm = props => {

	let { store, dispatch } = useContext(AppContext);
	const { form } = props;
	const { getFieldDecorator } = form;

	const [loadingGlobal, setLoadingGlobal] = useState(false);
	const [loadingContacts, setLoadingContacts] = useState(false);
	const [showingEditModal, setShowingEditModal] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [contactIdEditing, setContactIdEditing] = useState(-1);
	const [expand, setExpand] = useState(false);
	const [uses, setUses] = useState([
		'generic-contact',
	]);
	const [hostNotificationOptions, setHostNotificationOptions] = useState([
		'd', 'u', 'r', 'f', 's'
	]);
	const [hostNotificationCommands, setHostNotificationCommands] = useState([
		'notify-host-by-email',
	]);
	const [serviceNotificationOptions, setServiceNotificationOptions] = useState([
		'w', 'u', 'c', 'f', 's', 'r', 'n'
	]);
	const [serviceNotificationCommands, setServiceNotificationCommands] = useState([
		'notify-service-by-email',
	]);
	const [checkedHostSwitchAdding, setCheckedHostSwitchAdding] = useState(false);
	const [checkedServiceSwitchAdding, setCheckedServiceSwitchAdding] = useState(false);
	const [newContact, setNewContact] = useState(null);
	const [contactIdInlineEditing, setContactIdInlineEditing] = useState('');
	const [copyId, setCopyId] = useState(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [searchText, setSearchText] = useState(null);
	const pageSize = 10;

	notification.config({
		placement: 'bottomRight',
	});

	const getContacts = () => {
		setLoadingContacts(true);
		contactActions.getContacts().then((response) => {
			setLoadingContacts(false);
			if (response && response.data && response.data.data) {
				dispatch({ type: 'UPDATE_CONTACTS', payload: response.data.data.map((data, i) => { return { ...data, no: i + 1 } }) });
			} else {
				notification['error']({
					message: 'Error',
					description: response.data.msg ? response.data.msg : 'Failed to add contact data!',
				});
			}
		});
	}

	const reloadContactGroups = () => {
		contactGroupActions.getContactGroups().then((response) => {
			if (response && response.data && response.data.data) {
				dispatch({ type: 'UPDATE_CONTACTGROUPS', payload: response.data.data.map((data, i) => { return { ...data, no: i + 1 } }) });
			} else {
				console.error(response.data.msg ? response.data.msg : 'Failed to add contactgroup data!');
			}
		})
			.catch(function (error) {
				console.error(error);
			});
	}

	const deleteContact = (contactId) => {
		const contact = store.contacts.find(obj => obj.id == contactId);
		setLoadingGlobal(true);
		contactActions.deleteContact(contactId).then((response) => {
			setLoadingGlobal(false);
			if (response.data.error && response.data.error === true) {
				notification['error']({
					message: 'Error!',
					description: response.data.msg ? response.data.msg : `Failed to delete "${contact.contact_name}" contact!`,
				});
			} else {
				notification['success']({
					message: 'Success',
					description: `Succeed to delete "${contact.contact_name}" contact.`,
				});
				getContacts();
				reloadContactGroups();
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
				setSubmitting(true);
				if (contactIdEditing && contactIdEditing > 0) {
					const data = { ...values, id: contactIdEditing };
					contactActions.updateContact(data).then((response) => {
						setSubmitting(false);
						if (response.data.error && response.data.error === true) {
							notification['error']({
								message: 'Error',
								description: response.data.msg ? response.data.msg : 'Failed to add contact data!',
							});
						} else {
							notification['success']({
								message: 'Success',
								description: 'Succeed to update contact data.',
							});
							setContactIdEditing(-1);
							setShowingEditModal(false);
							getContacts();
							reloadContactGroups();
						}
					})
						.catch(function (error) {
							notification['error']({
								message: 'Error!',
								description: error.message,
							});
						});
				} else {
					contactActions.addContact(values).then((response) => {
						setSubmitting(false);
						if (response.data.error && response.data.error === true) {
							notification['error']({
								message: 'Error',
								description: response.data.msg ? response.data.msg : 'Failed to add contact data!',
							});
						} else {
							notification['success']({
								message: 'Success',
								description:
									'Succeed to add contact data.',
							});
							setContactIdEditing(-1);
							setShowingEditModal(false);
							getContacts();
							reloadContactGroups();
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

	const handleEdit = (contactId) => {
		setContactIdEditing(contactId);
	};

	const handleAdd = () => {
		setContactIdEditing(0);
	};

	const handleDelete = (contactId) => {
		const contact = store.contacts.find(obj => obj.id == contactId);
		Modal.confirm({
			title: `Are you sure delete "${contact.contact_name}" contact?`,
			okText: 'Yes',
			okType: 'danger',
			cancelText: 'No',
			onOk: () => deleteContact(contactId)
		});
	};

	const showEditModal = () => {
		setShowingEditModal(true);
		setExpand(false);
		if (contactIdEditing && contactIdEditing > 0) {
			const contact = store.contacts.find(obj => obj.id == contactIdEditing);
			form.setFieldsValue({
				...contact,
				contactgroups: contact.contactgroups ? contact.contactgroups.split(',') : [],
				use: contact.use ? contact.use.split(',') : [],
				host_notification_commands: contact.host_notification_commands ? contact.host_notification_commands.split(',') : [],
				service_notification_commands: contact.service_notification_commands ? contact.service_notification_commands.split(',') : [],
				host_notification_options: contact.host_notification_options ? contact.host_notification_options.split(',') : [],
				added_time: moment(contact.added_time).format(dateFormat),
				modified_time: moment(contact.modified_time).format(dateFormat)
			});
		} else {
			form.setFieldsValue({
				'contact_name': '',
				'alias': '',
				'email': '',
				'_text_number': '',
				contactgroups: [],
				use: [],
				host_notification_commands: [],
				service_notification_commands: [],
				host_notification_options: hostNotificationOptions
			});
		}
	};

	const handleCancel = () => {
		setContactIdEditing(-1);
		setShowingEditModal(false);
	};

	const toggleAdvanced = () => {
		setExpand(!expand);
	}

	const onHostSwitchChange = (checked) => {
		let contactEditing = null;
		if (contactIdEditing && contactIdEditing > 0) {
			contactEditing = store.contacts.find(obj => obj.id == contactIdEditing);
			dispatch({
				type: 'UPDATE_CONTACTS',
				payload: store.contacts.map(contact => contact.id === contactIdEditing ? {
					...contact, host_notifications_enabled: checked
				} : contact)
			});
		} else {
			setCheckedHostSwitchAdding(checked);
		}
	}

	const onServiceSwitchChange = (checked) => {
		let contactEditing = null;
		if (contactIdEditing && contactIdEditing > 0) {
			contactEditing = store.contacts.find(obj => obj.id == contactIdEditing);
			dispatch({
				type: 'UPDATE_CONTACTS',
				payload: store.contacts.map(contact => contact.id === contactIdEditing ? {
					...contact, service_notifications_enabled: checked
				} : contact)
			});
		} else {
			setCheckedServiceSwitchAdding(checked);
		}
	}

	useEffect(() => {
		getContacts();
	}, []);

	useEffect(() => {
		if (contactIdEditing >= 0) {
			showEditModal();
		}
	}, [contactIdEditing]);

	let contactEditing = null;
	if (contactIdEditing && contactIdEditing > 0) {
		contactEditing = store.contacts.find(obj => obj.id == contactIdEditing);
	}

	const handleCopy = (contactId) => {
		const contact = store.contacts.find(obj => obj.id == contactId);
		const rowVal = {
			...contact, 
			contact_name: `Copy of ${contact.contact_name}`
		}
		setNewContact({ 
			...rowVal, 
			id: -1 
		});
		setContactIdInlineEditing(-1);
		setCopyId(contact.id);
		form.setFieldsValue({
			...rowVal,
			contactgroups: rowVal.contactgroups ? rowVal.contactgroups.split(',') : [],
			use: rowVal.use ? rowVal.use.split(',') : [],
			host_notification_options: rowVal.host_notification_options ? rowVal.host_notification_options.split(',') : [],
			host_notification_commands: rowVal.host_notification_commands ? rowVal.host_notification_commands.split(',') : [],
			service_notification_commands: rowVal.service_notification_commands ? rowVal.service_notification_commands.split(',') : []
		});
	};

	const handleSave = (form, key) => {
    form.validateFields((error, row) => {
			if (error && 'contact_name' in error) {
        return;
			}
			const contact = store.contacts.find(obj => obj.id == copyId);
			const data = {
				...contact,
				...row,
			}
			setLoadingGlobal(true);
			contactActions.addContact(data).then((response) => {
				setLoadingGlobal(false);
				if (response.data.error && response.data.error === true) {
					notification['error']({
						message: 'Error',
						description: response.data.msg ? response.data.msg : 'Failed to add contact data!',
					});
				} else {
					notification['success']({
						message: 'Success',
						description:
							'Succeed to add contact data.',
					});
					setNewContact(null)
					setContactIdInlineEditing('');
					setCopyId(null);
					getContacts();
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
		setNewContact(null)
		setContactIdInlineEditing('');
		setCopyId(null);
  };

	const onPageChange = (page, pageSize) => {
		setCurrentPage(page);
	}

	const isEditing = record => record.id === contactIdInlineEditing;

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
			key: 'id',
		},
		{
			title: 'Name',
			dataIndex: 'contact_name',
			editable: true,
			className: 'textCenter',
			width: 200,
			key: 'contact_name',
			rules: [{ required: true, message: 'Please input Name!' }],
			...getColumnSearchProps('contact_name'),
			sorter: stringSorter('contact_name')
		},
		{
			title: 'Alias',
			dataIndex: 'alias',
			editable: true,
			className: 'textCenter',
			width: 200,
			key: 'alias',
			...getColumnSearchProps('alias'),
			sorter: stringSorter('alias')
		},
		{
			title: 'Email',
			dataIndex: 'email',
			editable: true,
			className: 'textCenter',
			width: 200,
			key: 'email',
			rules: [{ type: 'email', message: 'The input is not valid Email!' }],
			...getColumnSearchProps('email'),
			sorter: stringSorter('email')
		},
		{
			title: 'Cell',
			dataIndex: '_text_number',
			editable: true,
			className: 'textCenter',
			width: 200, key: '_text_number',
			...getColumnSearchProps('_text_number'),
			sorter: stringSorter('_text_number')
		},
		{
			title: 'Contactgroups',
			dataIndex: 'contactgroups',
			editable: true,
			className: 'textCenter',
			key: 'contactgroups',
			inputType: 'multiselect',
			items: store.contactGroups.map(d => d.contactgroup_name), rules: [{ type: 'array' }],
			...getColumnFilterProps(true, store.contactGroups.map(d => d.contactgroup_name), 'contactgroups'),
			sorter: stringSorter('contactgroups')
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
						<Button type="primary" style={{ ...buttonStyle, marginRight: 10 }} disabled={contactIdInlineEditing !== ''} onClick={() => handleEdit(record.id)} >
							<Icon type="edit" style={navIconStyle} />Edit</Button>
						<Button type="secondary" style={{ ...buttonStyle, marginRight: 10 }} disabled={contactIdInlineEditing !== ''} onClick={() => handleCopy(record.id)} >
							<Icon type="copy" style={navIconStyle} />Copy</Button>
						<Button style={{ ...buttonStyle }} disabled={contactIdInlineEditing !== ''} onClick={() => handleDelete(record.id)} >
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
				inputType: col.inputType ? col.inputType : 'text',
				dataIndex: col.dataIndex,
				title: col.title,
				editing: isEditing(record),
				items: col.items,
				rules: col.rules,
			}),
		};
	});

	const buttonStyle = {}
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
						<Button type="primary" style={{ ...buttonStyle, float: "right", marginBottom: 10 }} onClick={handleAdd} disabled={contactIdInlineEditing !== ''}>
							<Icon type="plus" style={navIconStyle} />Add New Contact
        		</Button>
						<EditableContext.Provider value={form}>
							<Table
								components={components}
								columns={columns}
								dataSource={newContact ? [...store.contacts.slice(0, pageSize * (currentPage - 1)), newContact, ...store.contacts.slice(pageSize * (currentPage - 1))] : store.contacts}
								bordered
								size='small'
								pagination={{ position: 'both', onChange: onPageChange }}
								loading={loadingContacts}
								rowKey="id"
							/>
						</EditableContext.Provider>
						
						<Modal
							width={800}
							visible={showingEditModal}
							title={contactIdEditing && contactIdEditing > 0 ? "Edit Contact" : "Add New Contact"}
							onOk={handleOk}
							onCancel={handleCancel}
							footer={[
								<Button key="back" style={{ ...buttonStyle }} onClick={handleCancel}>
									Cancel
            		</Button>,
								<Button key="submit" type="primary" style={{ ...buttonStyle }} loading={submitting} onClick={handleOk}>
									Submit
            		</Button>,
							]}
						>
							<Form labelCol={{ span: 8 }} wrapperCol={{ span: 16 }} labelAlign="left" onSubmit={handleOk}>
								<Form.Item label="Name">
									{getFieldDecorator('contact_name', {
										rules: columns.find(c => c.dataIndex === 'contact_name').rules,
									})(<Input disabled={contactEditing} />)}
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
								<Form.Item label="Email">
									{getFieldDecorator('email', {
										rules: columns.find(c => c.dataIndex === 'email').rules,
									})(<Input />)}
								</Form.Item>
								<Form.Item label="Cell">
									{getFieldDecorator('_text_number', {
										rules: columns.find(c => c.dataIndex === '_text_number').rules,
									})(<Input />)}
								</Form.Item>
								<Button key="advanced" style={{ border: "none", marginBottom: 10 }} onClick={toggleAdvanced}>
									{expand ? 'Simple' : 'Advanced'} ...
            		</Button>
								<div style={expand ? {} : { display: 'none' }}>
									<Form.Item label="Groups">
										{getFieldDecorator('contactgroups', {
											rules: columns.find(c => c.dataIndex === 'contactgroups').rules,
										})(
											<Select mode="multiple" placeholder="Please select contactgroups">
												{store.contactGroups.map((obj, i) => <Select.Option value={obj.contactgroup_name} key={i}>{obj.contactgroup_name}</Select.Option>)}
											</Select>
										)}
									</Form.Item>
									<Form.Item label="Use">
										{getFieldDecorator('use', {
											rules: [],
										})(
											<Select mode="multiple" placeholder="Please select contact templates">
												{store.contacttemplates.map((obj, i) => <Select.Option value={obj.name} key={i}>{obj.name}</Select.Option>)}
											</Select>
										)}
									</Form.Item>
									<Form.Item label="Host Notification">
										{getFieldDecorator('host_notifications_enabled')(<Switch checked={contactEditing ? contactEditing.host_notifications_enabled : checkedHostSwitchAdding} onChange={onHostSwitchChange} />)}
									</Form.Item>
									<Form.Item label="Notification Period">
										{getFieldDecorator('host_notification_period', {
											initialValue: store.timeperiods.length > 0 ? store.timeperiods[0].name : '',
											rules: [],
										})(
											<Select>
												{store.timeperiods.map((val,i) => <Select.Option value={val.name} key={i}>{val.name}</Select.Option>)}
											</Select>
										)}
									</Form.Item>
									<Form.Item label="Notification Options">
										{getFieldDecorator('host_notification_options', {
											initialValue: hostNotificationOptions,
										})(
											<Checkbox.Group style={{ width: '105%' }}>
												<Row>
													{hostNotificationOptions.map((val, i) => (
														<Col span={4} key={i}>
															<Checkbox value={val} checked={false}>{val}</Checkbox>
														</Col>
													))}
												</Row>
											</Checkbox.Group>,
										)}
									</Form.Item>
									<Form.Item label="Notification Command">
										{getFieldDecorator('host_notification_commands', {
											rules: [],
										})(
											<Select mode="multiple" placeholder="Please select commands">
												{store.commands.map((val, i) => <Select.Option value={val.command_name} key={i}>{val.command_name}</Select.Option>)}
											</Select>
										)}
									</Form.Item>
									<br />
									<Form.Item label="Service Notification">
										{getFieldDecorator('service_notifications_enabled')(<Switch checked={contactEditing ? contactEditing.service_notifications_enabled : checkedServiceSwitchAdding} onChange={onServiceSwitchChange} />)}
									</Form.Item>
									<Form.Item label="Notification Period">
										{getFieldDecorator('service_notification_period', {
											initialValue: store.timeperiods.length > 0 ? store.timeperiods[0].name : '',
											rules: [],
										})(
											<Select>
												{store.timeperiods.map((val, i) => <Select.Option value={val.name} key={i}>{val.name}</Select.Option>)}
											</Select>
										)}
									</Form.Item>
									<Form.Item label="Notification Command">
										{getFieldDecorator('service_notification_commands', {
											rules: [],
										})(
											<Select mode="multiple" placeholder="Please select commands">
												{store.commands.map((val, i) => <Select.Option value={val.command_name} key={i}>{val.command_name}</Select.Option>)}
											</Select>
										)}
									</Form.Item>
									{contactIdEditing && contactIdEditing > 0 ? (
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
								</div>
							</Form>
						</Modal>
					</Col>
				</Row>
			</Spin>
		</Container>
	)
}

export default Form.create({ name: 'ContactsAdminForm' })(ContactsAdminForm);