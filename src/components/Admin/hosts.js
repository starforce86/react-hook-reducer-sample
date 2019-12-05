// @flow
import * as React from 'react';
import { useContext, useState, useEffect, useRef } from 'react';
import { Container, Row, Col } from 'reactstrap';
import { Table, Modal, Button, Form, Input, Tooltip, Icon, notification, Switch, Checkbox, Select, Spin } from 'antd';
import moment from 'moment';
import Highlighter from 'react-highlight-words';
import { monitorActions } from '../../modules/Monitor';
import { serviceActions } from '../../modules/Services';
import { hostgroupActions } from '../../modules/Hostgroups';
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

const HostsAdminForm = props => {

	let { store, dispatch } = useContext(AppContext);
	const { form } = props;
	const { getFieldDecorator } = form;

	const [loadingGlobal, setLoadingGlobal] = useState(false);
	const [loadingHosts, setLoadingHosts] = useState(false);
	const [showingEditModal, setShowingEditModal] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [hostIdEditing, setHostIdEditing] = useState(-1);
	const [expand, setExpand] = useState(false);
	const [newHost, setNewHost] = useState(null);
	const [hostIdInlineEditing, setHostIdInlineEditing] = useState('');
	const [copyId, setCopyId] = useState(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [searchText, setSearchText] = useState(null);
	const [hostNotificationOptions, setHostNotificationOptions] = useState([
		'd', 'u', 'r', 'f', 's'
	]);
	const [checkedHostSwitchAdding, setCheckedHostSwitchAdding] = useState(true);
	const [timerId, setTimerId] = useState(null);
	const pageSize = 10;
	const updateInterval = 10000;

	notification.config({
		placement: 'bottomRight',
	});

	if (timerId == null) {
    setTimerId(setTimeout(() => { updateHosts() }, updateInterval));
	}
	
	const updateHosts = () => {
		monitorActions.getHostServiceStatusByRowNum(0, 0, null, 'id', 'desc', false, 0).then((response) => {
			if (response && response.data && response.data.data) {
				dispatch({ type: 'UPDATE_HOSTS', payload: response.data.data.map((data, i) => { return { ...data, no: i + 1 } })});
			} else {
				notification['error']({
					message: 'Error',
					description: response.data.msg ? response.data.msg : 'Failed to add contact data!',
				});
			}
			setTimerId(null);
		})
		.catch(function (error) {
			notification['error']({
				message: 'Error!',
				description: error.message,
			});
			setTimerId(null);
		});
	}
	
	const getHosts = () => {
		setLoadingHosts(true);
		monitorActions.getHostServiceStatusByRowNum(0, 0, null, 'id', 'desc', false, 0).then((response) => {
			setLoadingHosts(false);
			if (response && response.data && response.data.data) {
				dispatch({ type: 'UPDATE_HOSTS', payload: response.data.data.map((data, i) => { return { ...data, no: i + 1 } })});
			} else {
				notification['error']({
					message: 'Error',
					description: response.data.msg ? response.data.msg : 'Failed to add contact data!',
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

		hostgroupActions.getHostgroups().then((response) => {
			if (response && response.data && response.data.data) {
				dispatch({type:'UPDATE_HOSTGROUPS', payload: response.data.data.map((data, i) => { return { ...data, no: i + 1 } })});
			} else {
				console.error(response.data.msg ? response.data.msg : 'Failed to add host group data!');
			}
		});
	}

	const deleteHost = (hostId) => {
		const host = store.hosts.find(obj => obj.id == hostId);
		setLoadingGlobal(true);
		monitorActions.delHost(hostId).then((status) => {
			setLoadingGlobal(false);
			if (status) {
				notification['success']({
					message: 'Success',
					description: `Succeed to delete "${host.host_name}" host.`,
				});
				getHosts();
				reloadServices();
			} else {
				notification['error']({
					message: 'Error!',
					description: `Failed to delete "${host.host_name}" host!`,
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
				const snmp_version = 0;
				const notification_sms = '';

				if (values.notification_interval != null) {
					if (isNaN(values.notification_interval)) {
						setSubmitting(false);
						notification['error']({
							message: 'Error!',
							description: "Notification Interval must be type of number !",
						});
						return;
					}
					if (values.notification_interval <= 0 && values.notification_interval.toString().length != 0) {
						setSubmitting(false);
						notification['error']({
							message: 'Error!',
							description: "Notification Interval must greater than zero!",
						});
						return;
					}
				} else {
					values.notification_interval = "";
				}

				if (values.max_check_attempts != null) {
					if (isNaN(values.max_check_attempts)) {
						setSubmitting(false);
						notification['error']({
							message: 'Error!',
							description: "Max Check Attempts must be type of number !",
						});
						return;
					}
					if (values.max_check_attempts <= 0 && values.max_check_attempts.toString().length != 0) {
						setSubmitting(false);
						notification['error']({
							message: 'Error!',
							description: "Max Check Attempts must greater than zero!",
						});
						return;
					}
				} else {
					values.max_check_attempts = "";
				}

				if (values.check_interval != null) {
					if (isNaN(values.check_interval)) {
						setSubmitting(false);
						notification['error']({
							message: 'Error!',
							description: "Check Interval must be type of number !",
						});
						return;
					}
					if (values.check_interval <= 0 && values.check_interval.toString().length != 0) {
						setSubmitting(false);
						notification['error']({
							message: 'Error!',
							description: "Check Interval must greater than zero!",
						});
						return;
					}
				} else {
					values.check_interval = "";
				}

				if (values.retry_interval != null) {
					if (isNaN(values.retry_interval)) {
						setSubmitting(false);
						notification['error']({
							message: 'Error!',
							description: "Retry Interval must be type of number !",
						});
						return;
					}
					if (values.retry_interval <= 0 && values.retry_interval.toString().length != 0) {
						setSubmitting(false);
						notification['error']({
							message: 'Error!',
							description: "Retry Interval must greater than zero!",
						});
						return;
					}
				} else {
					values.retry_interval = "";
				}

				if (hostIdEditing && hostIdEditing > 0) {
					try {
						monitorActions.updateHost(
							hostIdEditing,
							values.host_name,
							values.address,
							values.street_address,
							values.contact_groups,
							snmp_version,
							values.contacts,
							notification_sms,
							values.alias.replace(/[\r\n]+/g, "\\n"),
							values.notes,
							values.notes_url,
							values.use,
							values.notification_period,
							values.notification_options,
							values.notifications_enabled,
							values.check_interval,
							values.retry_interval,
							values.max_check_attempts,
							values.notification_interval,
							values.check_command,
							values._SNMPCOMMUNITY
						).then((response) => {
							setSubmitting(false);
							if (!response.data.error) {
								notification['success']({
									message: 'Success',
									description:
										'Succeed to update host.',
								});
								setHostIdEditing(-1);
								setShowingEditModal(false);
								getHosts();
							} else {
								notification['error']({
									message: 'Error!',
									description: response.data.msg,
								});
							}
						})
							.catch(function (error) {
								setSubmitting(false);
								notification['error']({
									message: 'Error!',
									description: error.message,
								});
							});
					} catch (error) {
						setSubmitting(false);
						notification['error']({
							message: 'Error!',
							description: error.message,
						});
					}
				} else {
					if (checkedHostSwitchAdding == true) {
						values.notifications_enabled = 1;
					}

					monitorActions.addHost(
						values.host_name,
						values.address,
						values.street_address,
						values.contact_groups,
						snmp_version,
						values.contacts,
						notification_sms,
						values.alias.replace(/[\r\n]+/g, "\\n"),
						values.notes,
						values.notes_url,
						values.use,
						values.notification_period,
						values.notification_options,
						values.notifications_enabled,
						values.check_interval,
						values.retry_interval,
						values.max_check_attempts,
						values.notification_interval,
						values.check_command,
						values._SNMPCOMMUNITY
					).then((response) => {
						setSubmitting(false);
						if (!response.data.error) {
							notification['success']({
								message: 'Success',
								description:
									'Succeed to add host.',
							});
							setHostIdEditing(-1);
							setShowingEditModal(false);
							getHosts();
						} else {
							notification['error']({
								message: 'Error!',
								description: response.data.msg,
							});
						}
					})
						.catch(function (error) {
							setSubmitting(false);
							notification['error']({
								message: 'Error!',
								description: error.message,
							});
						});
				}
			}
		});
	};

	const handleEdit = (hostId) => {
		setHostIdEditing(hostId);
	};

	const handleAdd = () => {
		setHostIdEditing(0);
	};

	const handleDelete = (hostId) => {
		const host = store.hosts.find(obj => obj.id == hostId);
		Modal.confirm({
			title: `Are you sure delete "${host.host_name}" host?`,
			okText: 'Yes',
			okType: 'danger',
			cancelText: 'No',
			onOk: () => deleteHost(hostId)
		});
	};

	const showEditModal = () => {
		setShowingEditModal(true);
		setExpand(false);
		if (hostIdEditing && hostIdEditing > 0) {
			const host = store.hosts.find(obj => obj.id == hostIdEditing);
			form.setFieldsValue({
        ...host,
				contacts: host.contacts ? host.contacts.split(',') : [],
				use: host.use ? host.use.split(',') : [],
				contact_groups: host.contact_groups ? host.contact_groups.split(',') : [],
				notification_options: host.notification_options ? host.notification_options.split(',') : [],
				alias: host.alias ? host.alias.replace(/(\\n)/g, "\n") : '',
				added_time: moment(host.added_time).format(dateFormat),
				modified_time: moment(host.modified_time).format(dateFormat)
			});
		} else {
			form.setFieldsValue({
				host_name: '',
				address: '',
				street_address: '',
				alias: '',
				contacts: [],
				use: [],
				contact_groups: [],
				notes: '',
				notes_url: '',
				notification_period: '',
				notification_options: hostNotificationOptions,
				notifications_enabled: '1',
				check_interval: '5',
				retry_interval: '1',
				max_check_attempts: '5',
				notification_interval: '120',
				_SNMPCOMMUNITY: ''
			});
		}
	};

	const handleCancel = () => {
		setHostIdEditing(-1);
		setShowingEditModal(false);
	};

	const toggleAdvanced = () => {
		setExpand(!expand);
	}

	const onHostSwitchChange = (checked) => {
		let hostEditing = null;
		if (hostIdEditing && hostIdEditing > 0) {
			hostEditing = store.hosts.find(obj => obj.id == hostIdEditing);
			dispatch({
				type: 'UPDATE_HOSTS',
				payload: store.hosts.map(host => host.id === hostIdEditing ? {
					...host, notifications_enabled: checked
				} : host)
			});
		} else {
			setCheckedHostSwitchAdding(checked);
		}
	}

	useEffect(() => {
		getHosts();
	}, []);

	useEffect(() => {
		if (hostIdEditing >= 0) {
			showEditModal();
		}
	}, [hostIdEditing]);

	let hostEditing = null;
	if (hostIdEditing && hostIdEditing > 0) {
		hostEditing = store.hosts.find(obj => obj.id == hostIdEditing);
	}

	const handleCopy = (hostId) => {
		const host = store.hosts.find(obj => obj.id == hostId);
		const rowVal = {
			...host, 
			host_name: `Copy of ${host.host_name}`,
		}
		setNewHost({ 
			...rowVal, 
			id: -1 
		});
		setHostIdInlineEditing(-1);
		setCopyId(host.id);
		form.setFieldsValue({
			...rowVal,
			use: rowVal.use ? rowVal.use.split(',') : []
		});
	};

	const handleSave = (form, key) => {
    form.validateFields((error, row) => {
			if (error && 'host_name' in error) {
        return;
			}
			
			const host = store.hosts.find(obj => obj.id == copyId);
			const data = {
				...host,
				host_name: row.host_name,
				address: row.address,
				contacts: host.contacts ? host.contacts.split(',') : [],
				contact_groups: host.contact_groups ? host.contact_groups.split(',') : [],
				notification_options: host.notification_options ? host.notification_options.split(',') : []
			}
			setLoadingGlobal(true);

			const snmp_version = 0;
			const notification_sms = '';
			monitorActions.addHost(
				data.host_name,
				data.address,
				host.street_address,
				data.contact_groups,
				snmp_version,
				data.contacts,
				notification_sms,
				host.alias.replace(/[\r\n]+/g, "\\n"),
				host.notes,
				host.notes_url,
				host.notification_period,
				data.notification_options,
				host.notifications_enabled,
				host.check_interval,
				host.retry_interval,
				host.max_check_attempts,
				host.notification_interval,
				host.check_command,
				host._SNMPCOMMUNITY
			).then((response) => {
				setSubmitting(false);
				if (!response.data.error) {
					notification['success']({
						message: 'Success',
						description:
							'Succeed to add host.',
					});
					setNewHost(null)
					setHostIdInlineEditing('');
					setCopyId(null);
					getHosts();
					setLoadingGlobal(false);
				} else {
					notification['error']({
						message: 'Error!',
						description: response.data.msg,
					});
				}
			})
				.catch(function (error) {
					setSubmitting(false);
					notification['error']({
						message: 'Error!',
						description: error.message,
					});
				});
    });
  }

	const handleRowCancel = () => {
		setNewHost(null)
		setHostIdInlineEditing('');
		setCopyId(null);
  };

	const onPageChange = (page, pageSize) => {
		setCurrentPage(page);
	}

	const isEditing = record => record.id === hostIdInlineEditing;

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
			title: 'Host Name',
			dataIndex: 'host_name',
			editable: true,
			width: '17%',
			key: 'host_name',
			rules: [{ required: true, message: 'Please input Host Name!' }],
			...getColumnSearchProps('host_name'),
			sorter: stringSorter('host_name')
		},
		{
			title: 'Address',
			dataIndex: 'address',
			editable: true,
			width: '10%',
			key: 'address',
			rules: [{ required: true, message: 'Please input IP Address!' }],
			...getColumnSearchProps('address'),
			sorter: stringSorter('address')
		},
		{
			title: 'Status',
			dataIndex: 'host_status',
			width: '5%',
			key: 'host_status',
			...getColumnSearchProps('host_status'),
			sorter: stringSorter('host_status')
		},
		{
			title: 'Last Check',
			dataIndex: 'last_check',
			width: '10%', 
			key: 'last_check',
			render: text => moment(text * 1000).format(dateFormat),
			...getColumnSearchProps('last_check'),
			sorter: stringSorter('last_check')
		},
		{
			title: 'Duration',
			dataIndex: 'last_state_change',
			width: '10%',
			key: 'last_state_change',
			render: text => moment.duration(moment(Date.now()).diff(moment(text * 1000))).humanize(),
			...getColumnSearchProps('last_state_change'),
			sorter: stringSorter('last_state_change')
		},
		{
			title: 'Status Information',
			dataIndex: 'plugin_output',
			width: '25%',
			key: 'plugin_output',
			...getColumnSearchProps('plugin_output'),
			sorter: stringSorter('plugin_output')
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
						<Button type="primary" style={{ ...buttonStyle, marginRight: 10 }} disabled={hostIdInlineEditing !== ''} onClick={() => handleEdit(record.id)} >
							<Icon type="edit" style={navIconStyle} />Edit</Button>
						<Button type="secondary" style={{ ...buttonStyle, marginRight: 10 }} disabled={hostIdInlineEditing !== ''} onClick={() => handleCopy(record.id)} >
							<Icon type="copy" style={navIconStyle} />Copy</Button>
						<Button style={{ ...buttonStyle }} disabled={hostIdInlineEditing !== ''} onClick={() => handleDelete(record.id)} >
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
						<Button type="primary" style={{ ...buttonStyle, float: "right", marginBottom: 10 }} onClick={handleAdd} disabled={hostIdInlineEditing !== ''}>
							<Icon type="plus" style={navIconStyle} />Add New Host
        		</Button>
						<EditableContext.Provider value={form}>
							<Table
								components={components}
								columns={columns}
								dataSource={newHost ? [...store.hosts.slice(0, pageSize * (currentPage - 1)), newHost, ...store.hosts.slice(pageSize * (currentPage - 1))] : store.hosts}
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
							title={hostIdEditing && hostIdEditing > 0 ? "Edit Host" : "Add New Host"}
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
								<Form.Item label="Host Name">
									{getFieldDecorator('host_name', {
										rules: columns.find(c => c.dataIndex === 'host_name').rules,
									// })(<Input disabled={hostEditing} />)}
								})(<Input />)}
								</Form.Item>
								<Form.Item label="IP Address">
									{getFieldDecorator('address', {
										rules: columns.find(c => c.dataIndex === 'address').rules,
									})(<Input />)}
								</Form.Item>
								<Form.Item label="Contacts">
									{getFieldDecorator('contacts', {
										rules: [],
									})(
										<Select mode="multiple" placeholder="Please Select Contacts">
											{store.contacts.map((obj, i) => <Select.Option value={obj.contact_name} key={i}>{obj.contact_name}</Select.Option>)}
										</Select>
									)}
								</Form.Item>
								<Form.Item label="Contact Groups">
									{getFieldDecorator('contact_groups', {
										rules: [],
									})(
										<Select mode="multiple" placeholder="Please Select Contact Groups">
											{store.contactGroups.map((obj, i) => <Select.Option value={obj.contactgroup_name} key={i}>{obj.contactgroup_name}</Select.Option>)}
										</Select>
									)}
								</Form.Item>
								<Form.Item label="Notes">
									{getFieldDecorator('notes', {
										rules: [],
									})(<Input />)}
								</Form.Item>
								<Form.Item label="Notes URL">
									{getFieldDecorator('notes_url', {
										rules: [],
									})(<Input />)}
								</Form.Item>
								<Form.Item label="Description">
									{getFieldDecorator('alias', {
										rules: [],
									})(<Input.TextArea autosize={{ minRows: 6 }} />)}
								</Form.Item>
								<Button key="advanced" style={{ border: "none", marginBottom: 10 }} onClick={toggleAdvanced}>
									{expand ? 'Simple' : 'Advanced'} ...
            		</Button>
								<div style={expand ? {} : { display: 'none' }}>
									<Form.Item label="Notification">
										{getFieldDecorator('notifications_enabled')(<Switch checked={hostEditing ? hostEditing.notifications_enabled : checkedHostSwitchAdding} onChange={onHostSwitchChange} />)}
									</Form.Item>
									<Form.Item label="Use">
										{getFieldDecorator('use', {
											rules: [],
										})(
											<Select mode="multiple" placeholder="Please select host templates">
												{store.hosttemplates.map((obj, i) => <Select.Option value={obj.name} key={i}>{obj.name}</Select.Option>)}
											</Select>
										)}
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
											initialValue: 120
											// rules: [{ validator: checkNumber }]
										})(<Input />)}
									</Form.Item>
									<Form.Item label="Max Check Attempts">
										{getFieldDecorator('max_check_attempts', {
											initialValue: 5
											// rules: [{ validator: checkNumber }]
										})(<Input />)}
									</Form.Item>
									<Form.Item label="Check Interval">
										{getFieldDecorator('check_interval', {
											initialValue: 1
											// rules: [{ validator: checkNumber }]
										})(<Input />)}
									</Form.Item>
									<Form.Item label="Check Command">
										{getFieldDecorator('check_command', {
											initialValue: store.commands.length > 0 ? store.commands[0].command_name : '',
											rules: [],
										})(
											<Select>
												{store.commands.map((val,i) => <Select.Option value={val.command_name} key={i}>{val.command_name}</Select.Option>)}
											</Select>
										)}
									</Form.Item>
									<Form.Item label="Retry Interval">
										{getFieldDecorator('retry_interval', {
											initialValue: 1
											// rules: [{ validator: checkNumber }]
										})(<Input />)}
									</Form.Item>
									<Form.Item label="SNMP Community">
										{getFieldDecorator('_SNMPCOMMUNITY', {
											rules: [],
										})(<Input />)}
									</Form.Item>
									{hostIdEditing && hostIdEditing > 0 ? (
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

export default Form.create({ name: 'HostsAdminForm' })(HostsAdminForm);