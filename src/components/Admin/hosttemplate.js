// @flow
import * as React from 'react';
import { useContext, useState, useEffect, useRef } from 'react';
import { Container, Row, Col } from 'reactstrap';
import { Table, Modal, Button, Form, Input, Tooltip, Icon, notification, Switch, Checkbox, Select, Spin } from 'antd';
import moment from 'moment';
import Highlighter from 'react-highlight-words';
import { hostTemplateActions } from '../../modules/HostTemplate';
import { monitorActions } from '../../modules/Monitor';
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

const HostTemplatesAdminForm = props => {

	let { store, dispatch } = useContext(AppContext);
	const { form } = props;
	const { getFieldDecorator } = form;

	const [loadingGlobal, setLoadingGlobal] = useState(false);
	const [loadingHosts, setLoadingHosts] = useState(false);
	const [showingEditModal, setShowingEditModal] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [hostTemplateIdEditing, setHostTemplateIdEditing] = useState(-1);
	const [expand, setExpand] = useState(false);
	const [newHostTemplate, setNewHostTemplate] = useState(null);
	const [hostTemplateIdInlineEditing, setHostTemplateIdInlineEditing] = useState('');
	const [copyId, setCopyId] = useState(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [searchText, setSearchText] = useState(null);
	const [hostNotificationOptions, setHostNotificationOptions] = useState([
		'd', 'u', 'r', 'f', 's'
	]);
	const pageSize = 10;

	notification.config({
		placement: 'bottomRight',
	});
	
	const getHostTemplates = () => {
		setLoadingHosts(true);
		hostTemplateActions.getHostTemplates().then((response) => {
			setLoadingHosts(false);
			if (response && response.data && response.data.data) {
				dispatch({ type: 'UPDATE_HOSTTEMPLATES', payload: response.data.data.map((data, i) => { return { ...data, no: i + 1 } })});
			} else {
				notification['error']({
					message: 'Error',
					description: response.data.msg ? response.data.msg : 'Failed to add host template data!',
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

	const reloadHost = () => {
		monitorActions.getHostServiceStatusByRowNum(0, 0, null, 'id', 'desc', false, 0).then((response) => {
			if (response && response.data && response.data.data) {
				dispatch({ type: 'UPDATE_HOSTS', payload: response.data.data.map((data, i) => { return { ...data, no: i + 1 } })});
			} else {
				notification['error']({
					message: 'Error',
					description: response.data.msg ? response.data.msg : 'Failed to add host data!',
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

	const deleteHostTemplate = (hostTemplateId) => {
		const hosttemplate = store.hosttemplates.find(obj => obj.id == hostTemplateId);
		setLoadingGlobal(true);
		hostTemplateActions.deleteHostTemplate(hostTemplateId).then((status) => {
			setLoadingGlobal(false);
			if (status) {
				notification['success']({
					message: 'Success',
					description: `Succeed to delete "${hosttemplate.name}" host template.`,
				});
				getHostTemplates();
				reloadHost();
			} else {
				notification['error']({
					message: 'Error!',
					description: `Failed to delete "${hosttemplate.name}" host template!`,
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

	const handleOk = (e) => {
		e.preventDefault();
		form.validateFieldsAndScroll((err, values) => {
			if (!err) {
				setSubmitting(true);
				if (hostTemplateIdEditing && hostTemplateIdEditing > 0) {
                    const data = { ...values, id: hostTemplateIdEditing };
                    hostTemplateActions.updateHostTemplate(data).then((response) => {
						setSubmitting(false);
						if (response.data.error && response.data.error === true) {
							notification['error']({
								message: 'Error',
								description: response.data.msg ? response.data.msg : 'Failed to add host template data!',
							});
						} else {
							notification['success']({
								message: 'Success',
								description: 'Succeed to update host template data.',
							});
							setHostTemplateIdEditing(-1);
							setShowingEditModal(false);
							getHostTemplates();
						}
					})
                    .catch(function (error) {
                        notification['error']({
                            message: 'Error!',
                            description: error.message,
                        });
                    });
				} else {
                    hostTemplateActions.addHostTemplate(values).then((response) => {
						setSubmitting(false);
						if (response.data.error && response.data.error === true) {
							notification['error']({
								message: 'Error',
								description: response.data.msg ? response.data.msg : 'Failed to add host template data!',
							});
						} else {
							notification['success']({
								message: 'Success',
								description:
									'Succeed to add host template data.',
							});
							setHostTemplateIdEditing(-1);
							setShowingEditModal(false);
							getHostTemplates();
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

	const handleEdit = (hostTemplateId) => {
		setHostTemplateIdEditing(hostTemplateId);
	};

	const handleAdd = () => {
		setHostTemplateIdEditing(0);
	};

	const handleDelete = (hostTemplateId) => {
		const hosttemplate = store.hosttemplates.find(obj => obj.id == hostTemplateId);
		Modal.confirm({
			title: `Are you sure delete "${hosttemplate.name}" host template?`,
			okText: 'Yes',
			okType: 'danger',
			cancelText: 'No',
			onOk: () => deleteHostTemplate(hostTemplateId)
		});
	};

	const showEditModal = () => {
		setShowingEditModal(true);
		setExpand(false);
		if (hostTemplateIdEditing && hostTemplateIdEditing > 0) {
			const hosttemplate = store.hosttemplates.find(obj => obj.id == hostTemplateIdEditing);
			form.setFieldsValue({
                ...hosttemplate,
                notification_options: hosttemplate.notification_options ? hosttemplate.notification_options.split(',') : [],
                check_command: hosttemplate.check_command ? hosttemplate.check_command.split(',') : [],
				added_time: moment(hosttemplate.added_time).format(dateFormat),
				modified_time: moment(hosttemplate.modified_time).format(dateFormat)
			});
		} else {
			form.setFieldsValue({
				'name': '',
                notification_options: hostNotificationOptions,
                check_command: store.commands ? [store.commands[0].command_name] : [],
				check_interval: '5',
				retry_interval: '1',
				max_check_attempts: '5',
				notification_interval: '120'
			});
		}
	};

	const handleCancel = () => {
		setHostTemplateIdEditing(-1);
		setShowingEditModal(false);
	};

	const toggleAdvanced = () => {
		setExpand(!expand);
	}

	useEffect(() => {
		getHostTemplates();
	}, []);

	useEffect(() => {
		if (hostTemplateIdEditing >= 0) {
			showEditModal();
		}
	}, [hostTemplateIdEditing]);

	let hostTemplateEditing = null;
	if (hostTemplateIdEditing && hostTemplateIdEditing > 0) {
		hostTemplateEditing = store.hosttemplates.find(obj => obj.id == hostTemplateIdEditing);
	}

	const handleCopy = (hostTemplateId) => {
		const hosttemplate = store.hosttemplates.find(obj => obj.id == hostTemplateId);
		const rowVal = {
			...hosttemplate, 
			name: `Copy of ${hosttemplate.name}`,
		}
		setNewHostTemplate({ 
			...rowVal, 
			id: -1 
		});
		setHostTemplateIdInlineEditing(-1);
        setCopyId(host.id);
        form.setFieldsValue({
			...rowVal,
			notification_options: hosttemplate.notification_options ? hosttemplate.notification_options.split(',') : [],
			check_command: hosttemplate.check_command ? hosttemplate.check_command.split(',') : [],
		});
	};

	const handleSave = (form, key) => {
        form.validateFields((error, row) => {
			if (error && 'name' in error) {
                return;
			}
			
			const hosttemplate = store.hosttemplates.find(obj => obj.id == copyId);
			const data = {
                ...hosttemplate,
                ...row,
			}
			setLoadingGlobal(true);
            hostTemplateActions.addHostTemplate(data).then((response) => {
                setLoadingGlobal(false);
                if (response.data.error && response.data.error === true) {
                    notification['error']({
                        message: 'Error',
                        description: response.data.msg ? response.data.msg : 'Failed to add host template data!',
                    });
                } else {
                    notification['success']({
                        message: 'Success',
                        description:
                            'Succeed to add host template data.',
                    });
                    setNewHostTemplate(null)
                    setHostTemplateIdInlineEditing('');
                    setCopyId(null);
                    getHostTemplates();
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
		setNewHostTemplate(null)
		setHostTemplateIdInlineEditing('');
		setCopyId(null);
  };

	const onPageChange = (page, pageSize) => {
		setCurrentPage(page);
	}

	const isEditing = record => record.id === hostTemplateIdInlineEditing;

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
			width: '3%', 
			dataIndex: 'no',
			key: 'id',
		},
		{
			title: 'Name',
			dataIndex: 'name',
			editable: true,
			className: 'textCenter',
			width: '17%',
			key: 'name',
			rules: [{ required: true, message: 'Please input Name!' }],
			...getColumnSearchProps('name'),
			sorter: stringSorter('name')
        },
        {
			title: 'Notification Period',
			dataIndex: 'notification_period',
			editable: true,
			className: 'textCenter',
			width: 200,
			key: 'notification_period',
			inputType: 'select',
			items: store.timeperiods.map(d => d.name),
			...getColumnFilterProps(false, store.timeperiods.map(d => d.name), 'notification_period'),
			sorter: stringSorter('notification_period')
        },
        {
			title: 'Check Commands',
			dataIndex: 'check_command',
			editable: true,
			className: 'textCenter',
			key: 'check_command',
			inputType: 'multiselect',
			items: store.commands.map(d => d.command_name), rules: [{ type: 'array' }],
			...getColumnFilterProps(true, store.commands.map(d => d.command_name), 'check_command'),
			sorter: stringSorter('check_command')
        },
		{
			title: 'Actions', dataIndex: '', className: 'textCenter', width: '15%', render: (text, record) => {
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
						<Button type="primary" style={{ ...buttonStyle, marginRight: 10 }} disabled={hostTemplateIdInlineEditing !== ''} onClick={() => handleEdit(record.id)} >
							<Icon type="edit" style={navIconStyle} />Edit</Button>
						<Button type="secondary" style={{ ...buttonStyle, marginRight: 10 }} disabled={hostTemplateIdInlineEditing !== ''} onClick={() => handleCopy(record.id)} >
							<Icon type="copy" style={navIconStyle} />Copy</Button>
						<Button style={{ ...buttonStyle }} disabled={hostTemplateIdInlineEditing !== ''} onClick={() => handleDelete(record.id)} >
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

	const checkNumber = (rule, value, callback) => {
		if (isNaN(value)) {
			callback('Input must be type of number!');
			return;
		}
		if (value > 0) {
			callback();
      return;
		}
    callback('Input must greater than zero!');
	}

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
						<Button type="primary" style={{ ...buttonStyle, float: "right", marginBottom: 10 }} onClick={handleAdd} disabled={hostTemplateIdInlineEditing !== ''}>
							<Icon type="plus" style={navIconStyle} />Add New Host Template
        		        </Button>
						<EditableContext.Provider value={form}>
							<Table
								components={components}
								columns={columns}
								dataSource={newHostTemplate ? [...store.hosttemplates.slice(0, pageSize * (currentPage - 1)), newHostTemplate, ...store.hosttemplates.slice(pageSize * (currentPage - 1))] : store.hosttemplates}
								bordered
								size='small'
								pagination={{ position: 'both', onChange: onPageChange }}
								loading={loadingHosts}
								rowKey="id"
							/>
						</EditableContext.Provider>
						
						<Modal
							width={800}
							visible={showingEditModal}
							title={hostTemplateIdEditing && hostTemplateIdEditing > 0 ? "Edit Host Template" : "Add New Host Template"}
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
							<Form labelCol={{ span: 5 }} wrapperCol={{ span: 19 }} labelAlign="left" onSubmit={handleOk}>
								<Form.Item label="Host Template Name">
									{getFieldDecorator('name', {
										rules: columns.find(c => c.dataIndex === 'name').rules,
									})(<Input disabled={hostTemplateEditing} />)}
								</Form.Item>
                                <Form.Item label="Notification Period">
                                    {getFieldDecorator('notification_period', {
                                        initialValue: store.timeperiods.length > 0 ? store.timeperiods[0].name : '',
                                        rules: [],
                                    })(
                                        <Select>
                                            {store.timeperiods.map((val,i) => <Select.Option value={val.name} key={i}>{val.name}</Select.Option>)}
                                        </Select>
                                    )}
                                </Form.Item>
                                <Form.Item label="Notification Options">
                                    {getFieldDecorator('notification_options', {
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
                                <Form.Item label="Notification Interval">
                                    {getFieldDecorator('notification_interval', {
                                        initialValue: 120,
                                        rules: [{ validator: checkNumber }]
                                    })(<Input />)}
                                </Form.Item>
                                <Form.Item label="Check Period">
                                    {getFieldDecorator('check_period', {
                                        initialValue: store.timeperiods.length > 0 ? store.timeperiods[0].name : '',
                                        rules: [],
                                    })(
                                        <Select>
                                            {store.timeperiods.map((val,i) => <Select.Option value={val.name} key={i}>{val.name}</Select.Option>)}
                                        </Select>
                                    )}
                                </Form.Item>
                                <Form.Item label="Check Command">
                                    {getFieldDecorator('check_command', {
                                        initialValue: store.commands.length > 0 ? store.commands[0].command_name : '',
                                        rules: [],
                                    })(
                                        <Select mode="multiple" placeholder="Please select Commands">
											{store.commands.map((obj, i) => <Select.Option value={obj.command_name} key={i}>{obj.command_name}</Select.Option>)}
                                        </Select>
                                    )}
                                </Form.Item>
                                <Form.Item label="Max Check Attempts">
                                    {getFieldDecorator('max_check_attempts', {
                                        initialValue: 5,
                                        rules: [{ validator: checkNumber }]
                                    })(<Input />)}
                                </Form.Item>
                                <Form.Item label="Check Interval">
                                    {getFieldDecorator('check_interval', {
                                        initialValue: 1,
                                        rules: [{ validator: checkNumber }]
                                    })(<Input />)}
                                </Form.Item>
                                <Form.Item label="Retry Interval">
                                    {getFieldDecorator('retry_interval', {
                                        initialValue: 1,
                                        rules: [{ validator: checkNumber }]
                                    })(<Input />)}
                                </Form.Item>
                                {hostTemplateIdEditing && hostTemplateIdEditing > 0 ? (
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

export default Form.create({ name: 'HostTemplatesAdminForm' })(HostTemplatesAdminForm);