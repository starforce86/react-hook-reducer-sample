// @flow
import * as React from 'react';
import { useContext, useState, useEffect, useRef } from 'react';
import { Container, Row, Col } from 'reactstrap';
import { Table, Modal, Button, Form, Input, Tooltip, Icon, notification, Switch, Checkbox, Select, Spin } from 'antd';
import moment from 'moment';
import Highlighter from 'react-highlight-words';
import { contactTemplateActions } from '../../modules/ContactTemplate';
import { contactActions } from '../../modules/Contact';
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

const ContactTemplatesAdminForm = props => {

	let { store, dispatch } = useContext(AppContext);
	const { form } = props;
	const { getFieldDecorator } = form;

	const [loadingGlobal, setLoadingGlobal] = useState(false);
	const [loadingContacts, setLoadingContacts] = useState(false);
	const [showingEditModal, setShowingEditModal] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [contactTemplateIdEditing, setContactTemplateIdEditing] = useState(-1);
	const [expand, setExpand] = useState(false);
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
	const [newContactTemplate, setNewContactTemplate] = useState(null);
	const [contactTemplateIdInlineEditing, setContactTemplateIdInlineEditing] = useState('');
	const [copyId, setCopyId] = useState(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [searchText, setSearchText] = useState(null);
	const pageSize = 10;

	notification.config({
		placement: 'bottomRight',
	});

	const getContactTemplates = () => {
		setLoadingContacts(true);
		contactTemplateActions.getContactTemplates().then((response) => {
			setLoadingContacts(false);
			if (response && response.data && response.data.data) {
				dispatch({ type: 'UPDATE_CONTACTTEMPLATES', payload: response.data.data.map((data, i) => { return { ...data, no: i + 1 } }) });
			} else {
				notification['error']({
					message: 'Error',
					description: response.data.msg ? response.data.msg : 'Failed to add contact template data!',
				});
			}
		});
	}

	const reloadContact = () => {
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

	const deleteContactTemplate = (contactTemplateId) => {
		const contacttemplate = store.contacttemplates.find(obj => obj.id == contactTemplateId);
		setLoadingGlobal(true);
		contactTemplateActions.deleteContactTemplate(contactTemplateId).then((response) => {
			setLoadingGlobal(false);
			if (response.data.error && response.data.error === true) {
				notification['error']({
					message: 'Error!',
					description: response.data.msg ? response.data.msg : `Failed to delete "${contacttemplate.name}" contact template!`,
				});
			} else {
				notification['success']({
					message: 'Success',
					description: `Succeed to delete "${contacttemplate.name}" contact template.`,
				});
				getContactTemplates();
				reloadContact();
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
				if (contactTemplateIdEditing && contactTemplateIdEditing > 0) {
					const data = { ...values, id: contactTemplateIdEditing };
					contactTemplateActions.updateContactTemplate(data).then((response) => {
						setSubmitting(false);
						if (response.data.error && response.data.error === true) {
							notification['error']({
								message: 'Error',
								description: response.data.msg ? response.data.msg : 'Failed to add contact template data!',
							});
						} else {
							notification['success']({
								message: 'Success',
								description: 'Succeed to update contact template data.',
							});
							setContactTemplateIdEditing(-1);
							setShowingEditModal(false);
							getContactTemplates();
						}
					})
                    .catch(function (error) {
                        notification['error']({
                            message: 'Error!',
                            description: error.message,
                        });
                    });
				} else {
					contactTemplateActions.addContactTemplate(values).then((response) => {
						setSubmitting(false);
						if (response.data.error && response.data.error === true) {
							notification['error']({
								message: 'Error',
								description: response.data.msg ? response.data.msg : 'Failed to add contact template data!',
							});
						} else {
							notification['success']({
								message: 'Success',
								description:
									'Succeed to add contact template data.',
							});
							setContactTemplateIdEditing(-1);
							setShowingEditModal(false);
							getContactTemplates();
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

	const handleEdit = (contactTemplateId) => {
		setContactTemplateIdEditing(contactTemplateId);
	};

	const handleAdd = () => {
		setContactTemplateIdEditing(0);
	};

	const handleDelete = (contactTemplateId) => {
		const contacttemplate = store.contacttemplates.find(obj => obj.id == contactTemplateId);
		Modal.confirm({
			title: `Are you sure delete "${contacttemplate.name}" contact template?`,
			okText: 'Yes',
			okType: 'danger',
			cancelText: 'No',
			onOk: () => deleteContactTemplate(contactTemplateId)
		});
	};

	const showEditModal = () => {
		setShowingEditModal(true);
		setExpand(false);
		if (contactTemplateIdEditing && contactTemplateIdEditing > 0) {
			const contacttemplate = store.contacttemplates.find(obj => obj.id == contactTemplateIdEditing);
			form.setFieldsValue({
				...contacttemplate,
                host_notification_options: contacttemplate.host_notification_options ? contacttemplate.host_notification_options.split(',') : [],
				service_notification_options: contacttemplate.service_notification_options ? contacttemplate.service_notification_options.split(',') : [],
				host_notification_commands: contacttemplate.host_notification_commands ? contacttemplate.host_notification_commands.split(',') : [],
				service_notification_commands: contacttemplate.service_notification_commands ? contacttemplate.service_notification_commands.split(',') : [],
				added_time: moment(contacttemplate.added_time).format(dateFormat),
				modified_time: moment(contacttemplate.modified_time).format(dateFormat)
			});
		} else {
			form.setFieldsValue({
				'name': '',
				host_notification_commands: store.commands ? [store.commands[0].command_name] : [],
				service_notification_commands: store.commands ? [store.commands[0].command_name] : [],
				host_notification_options: hostNotificationOptions,
				service_notification_options: serviceNotificationOptions
			});
		}
	};

	const handleCancel = () => {
		setContactTemplateIdEditing(-1);
		setShowingEditModal(false);
	};

	const toggleAdvanced = () => {
		setExpand(!expand);
	}

	useEffect(() => {
		getContactTemplates();
	}, []);

	useEffect(() => {
		if (contactTemplateIdEditing >= 0) {
			showEditModal();
		}
	}, [contactTemplateIdEditing]);

	let contactTemplateEditing = null;
	if (contactTemplateIdEditing && contactTemplateIdEditing > 0) {
		contactTemplateEditing = store.contacttemplates.find(obj => obj.id == contactTemplateIdEditing);
	}

	const handleCopy = (contactTemplateId) => {
		const contacttemplate = store.contacttemplates.find(obj => obj.id == contactTemplateId);
		const rowVal = {
			...contacttemplate, 
			name: `Copy of ${contacttemplate.name}`
		}
		setNewContactTemplate({ 
			...rowVal, 
			id: -1 
		});
		setContactTemplateIdInlineEditing(-1);
		setCopyId(contacttemplate.id);
		form.setFieldsValue({
			...rowVal,
			host_notification_options: contacttemplate.host_notification_options ? contacttemplate.host_notification_options.split(',') : [],
			service_notification_options: contacttemplate.service_notification_options ? contacttemplate.service_notification_options.split(',') : [],
			host_notification_commands: contacttemplate.host_notification_commands ? contacttemplate.host_notification_commands.split(',') : [],
			service_notification_commands: contacttemplate.service_notification_commands ? contacttemplate.service_notification_commands.split(',') : [],
		});
	};

	const handleSave = (form, key) => {
    form.validateFields((error, row) => {
        if (error && 'name' in error) {
            return;
        }
        const contacttemplate = store.contacttemplates.find(obj => obj.id == copyId);
        const data = {
            ...contacttemplate,
            ...row,
        }
        setLoadingGlobal(true);
        contactTemplateActions.addContactTemplate(data).then((response) => {
            setLoadingGlobal(false);
            if (response.data.error && response.data.error === true) {
                notification['error']({
                    message: 'Error',
                    description: response.data.msg ? response.data.msg : 'Failed to add contact template data!',
                });
            } else {
                notification['success']({
                    message: 'Success',
                    description:
                        'Succeed to add contact template data.',
                });
                setNewContactTemplate(null)
                setContactTemplateIdInlineEditing('');
                setCopyId(null);
                getContactTemplates();
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
		setNewContactTemplate(null)
		setContactTemplateIdInlineEditing('');
		setCopyId(null);
  };

	const onPageChange = (page, pageSize) => {
		setCurrentPage(page);
	}

	const isEditing = record => record.id === contactTemplateIdInlineEditing;

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
			dataIndex: 'name',
			editable: true,
			className: 'textCenter',
			width: 200,
			key: 'name',
			rules: [{ required: true, message: 'Please input Name!' }],
			...getColumnSearchProps('name'),
			sorter: stringSorter('name')
		},
		{
			title: 'Host Notification Period',
			dataIndex: 'host_notification_period',
			editable: true,
			className: 'textCenter',
			width: 200,
			key: 'host_notification_period',
			inputType: 'select',
			items: store.timeperiods.map(d => d.name),
			...getColumnFilterProps(false, store.timeperiods.map(d => d.name), 'host_notification_period'),
			sorter: stringSorter('host_notification_period')
		},
		{
			title: 'Service Notification Period',
			dataIndex: 'service_notification_period',
			editable: true,
			className: 'textCenter',
			width: 200, 
			key: 'service_notification_period',
			inputType: 'select',
			items: store.timeperiods.map(d => d.name),
			...getColumnFilterProps(false, store.timeperiods.map(d => d.name), 'service_notification_period'),
			sorter: stringSorter('service_notification_period')
		},
		{
			title: 'Host Notification Commands',
			dataIndex: 'host_notification_commands',
			editable: true,
			className: 'textCenter',
			key: 'host_notification_commands',
			inputType: 'multiselect',
			items: store.commands.map(d => d.command_name), rules: [{ type: 'array' }],
			...getColumnFilterProps(true, store.commands.map(d => d.command_name), 'host_notification_commands'),
			sorter: stringSorter('host_notification_commands')
        },
        {
			title: 'Service Notification Commands',
			dataIndex: 'service_notification_commands',
			editable: true,
			className: 'textCenter',
			key: 'service_notification_commands',
			inputType: 'multiselect',
			items: store.commands.map(d => d.command_name), rules: [{ type: 'array' }],
			...getColumnFilterProps(true, store.commands.map(d => d.command_name), 'service_notification_commands'),
			sorter: stringSorter('service_notification_commands')
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
						<Button type="primary" style={{ ...buttonStyle, marginRight: 10 }} disabled={contactTemplateIdInlineEditing !== ''} onClick={() => handleEdit(record.id)} >
							<Icon type="edit" style={navIconStyle} />Edit</Button>
						<Button type="secondary" style={{ ...buttonStyle, marginRight: 10 }} disabled={contactTemplateIdInlineEditing !== ''} onClick={() => handleCopy(record.id)} >
							<Icon type="copy" style={navIconStyle} />Copy</Button>
						<Button style={{ ...buttonStyle }} disabled={contactTemplateIdInlineEditing !== ''} onClick={() => handleDelete(record.id)} >
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
						<Button type="primary" style={{ ...buttonStyle, float: "right", marginBottom: 10 }} onClick={handleAdd} disabled={contactTemplateIdInlineEditing !== ''}>
							<Icon type="plus" style={navIconStyle} />Add New Contact Template
        		</Button>
						<EditableContext.Provider value={form}>
							<Table
								components={components}
								columns={columns}
								dataSource={newContactTemplate ? [...store.contacttemplates.slice(0, pageSize * (currentPage - 1)), newContactTemplate, ...store.contacttemplates.slice(pageSize * (currentPage - 1))] : store.contacttemplates}
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
							title={contactTemplateIdEditing && contactTemplateIdEditing > 0 ? "Edit Contact Template" : "Add New Contact Template"}
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
									{getFieldDecorator('name', {
										rules: columns.find(c => c.dataIndex === 'name').rules,
									})(<Input disabled={contactTemplateEditing} />)}
								</Form.Item>
                                <Form.Item label="Host Notification Period">
                                    {getFieldDecorator('host_notification_period', {
                                        initialValue: store.timeperiods.length > 0 ? store.timeperiods[0].name : '',
                                        rules: [],
                                    })(
                                        <Select>
                                            {store.timeperiods.map((val,i) => <Select.Option value={val.name} key={i}>{val.name}</Select.Option>)}
                                        </Select>
                                    )}
                                </Form.Item>
                                <Form.Item label="Host Notification Options">
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
                                <Form.Item label="Host Notification Command">
                                    {getFieldDecorator('host_notification_commands', {
                                        initialValue: store.commands.length > 0 ? store.commands[0].command_name : '',
                                        rules: [],
                                    })(
                                        <Select mode="multiple" placeholder="Please select Host Notification Commands">
											{store.commands.map((obj, i) => <Select.Option value={obj.command_name} key={i}>{obj.command_name}</Select.Option>)}
                                        </Select>
                                    )}
                                </Form.Item>
                                <br />
                                <Form.Item label="Service Notification Period">
                                    {getFieldDecorator('service_notification_period', {
                                        initialValue: store.timeperiods.length > 0 ? store.timeperiods[0].name : '',
                                        rules: [],
                                    })(
                                        <Select>
                                            {store.timeperiods.map((val, i) => <Select.Option value={val.name} key={i}>{val.name}</Select.Option>)}
                                        </Select>
                                    )}
                                </Form.Item>
                                <Form.Item label="Service Notification Options">
                                    {getFieldDecorator('service_notification_options', {
                                        initialValue: serviceNotificationOptions,
                                    })(
                                        <Checkbox.Group style={{ width: '105%' }}>
                                            <Row>
                                                {serviceNotificationOptions.map((val, i) => (
                                                    <Col span={4} key={i}>
                                                        <Checkbox value={val} checked={false}>{val}</Checkbox>
                                                    </Col>
                                                ))}
                                            </Row>
                                        </Checkbox.Group>,
                                    )}
                                </Form.Item>
                                <Form.Item label="Service Notification Command">
                                    {getFieldDecorator('service_notification_commands', {
                                        initialValue: store.commands.length > 0 ? store.commands[0].command_name : '',
                                        rules: [],
                                    })(
                                        <Select mode="multiple" placeholder="Please select Service Notification Commands">
                                            {store.commands.map((obj, i) => <Select.Option value={obj.command_name} key={i}>{obj.command_name}</Select.Option>)}
                                        </Select>
                                    )}
                                </Form.Item>
                                {contactTemplateIdEditing && contactTemplateIdEditing > 0 ? (
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
	)
}

export default Form.create({ name: 'ContactTemplatesAdminForm' })(ContactTemplatesAdminForm);