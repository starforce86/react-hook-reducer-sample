// @flow
import * as React from 'react';
import { useContext, useState, useEffect, useRef } from 'react';
import { Container, Row, Col } from 'reactstrap';
import { Table, Modal, Button, Form, Input, Tooltip, Icon, notification, Switch, Checkbox, Select, Spin, Tabs } from 'antd';
import moment from 'moment';
import debounce from 'lodash/debounce';
import Highlighter from 'react-highlight-words';
import { monitorActions } from '../../modules/Monitor';
import { contactActions } from '../../modules/Contact';
import { contactGroupActions } from '../../modules/ContactGroups';
import { serviceActions } from '../../modules/Services';
import { serviceGroupActions } from '../../modules/ServiceGroups';
import { AppContext } from '../../App';

const dateFormat = 'MM/DD/YYYY hh:mm A';

const EditableContext = React.createContext();

const { TabPane } = Tabs;

class EditableCell extends React.Component {

	constructor(props: Props) {
    super(props);
    this.state = {
			fetchingHosts: false,
			value: [],
			hosts: [],
		}
		this.lastFetchId = 0;
  }

	fetchHostsFunc = value => {
    this.lastFetchId += 1;
    const fetchId = this.lastFetchId;
		this.setState({
			hosts: [],
			fetchingHosts: true,
		});
		if(!value) {
			return;
		}
		monitorActions.searchHosts(value).then((response) => {
			if (fetchId !== this.lastFetchId) {
				// for fetch callback order
				return;
			}
			if (response && response.data && response.data.data) {
				this.setState({
					hosts: response.data.data,
					fetchHosts: false
				})
			} else {
				console.log('fetchHostsFunc error!');
			}
		})
			.catch(function (error) {
				console.error(error);
			});
	};
	fetchHosts = debounce(this.fetchHostsFunc, 800);

	handleHostChange = value => {
		this.setState({
			value: [],
			hosts: [],
			fetchingHosts: false,
		})
	};

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
					{(items ? items : []).map((d, i) => <Select.Option value={d} key={i}>{d}</Select.Option>)}
				</Select>
			)
		} else if(this.props.inputType === 'remotehost') {
			return (
				<Select
					mode="multiple"
					placeholder="Please input few letters to search hosts"
					notFoundContent={this.state.fetchingHosts ? <Spin size="small" /> : null}
					filterOption={false}
					onSearch={this.fetchHosts}
					onChange={this.handleHostChange}
					style={{ width: '100%' }}
				>
					{this.state.hosts.map(d => (
						<Option key={d.id} value={d.host_name}>{d.host_name}</Option>
					))}
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
              initialValue: inputType === 'multiselect' || inputType === 'remotehost' ? (record[dataIndex] ? record[dataIndex].split(',') : []) : record[dataIndex],
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

const formItemLayoutWithOutLabel = {
	wrapperCol: {
		xs: { span: 24, offset: 0 },
		sm: { span: 18, offset: 6 },
	},
};

const ServicesAdminForm = props => {

	let { store, dispatch } = useContext(AppContext);
	const { form } = props;
	const { getFieldDecorator } = form;

	const [hosts, setHosts] = useState([]);
	const [value, setValue] = useState([]);
	const [fetchingHosts, setFetchingHosts] = useState(false);
	const [loadingGlobal, setLoadingGlobal] = useState(false);
	const [loadingServices, setLoadingServices] = useState(false);
	const [loadingSnmp, setLoadingSnmp] = useState(false);
	const [showingEditModal, setShowingEditModal] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [serviceIdEditing, setServiceIdEditing] = useState(-1);
	const [expand, setExpand] = useState(false);
	const [cmdExpand, setCmdExpand] = useState(false);
	const [snmptrafficExpand, setSnmptrafficExpand] = useState(false);
	const [newService, setNewService] = useState(null);
	const [serviceIdInlineEditing, setServiceIdInlineEditing] = useState('');
	const [copyId, setCopyId] = useState(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [searchText, setSearchText] = useState(null);
	const [selectedRowKeysTraffic, setSelectedRowKeysTraffic] = useState([]);
	const [selectedIFNamesTraffic, setSelectedIFNamesTraffic] = useState([]);
	const [selectedCheckTraffic, setSelectedCheckTraffic] = useState([]);
	const [trafficData, setTrafficData] = useState([]);
	const [checkCommandParam, setCheckCommandParam] = useState('');
	const pageSize = 10;
	let lastFetchId = 0;
	
	notification.config({
		placement: 'bottomRight',
	});

	const fetchHostsFunc = value => {
    lastFetchId += 1;
    const fetchId = lastFetchId;
		setHosts([]);
		setFetchingHosts(true);
		if(!value) {
			return;
		}
		monitorActions.searchHosts(value).then((response) => {
			if (fetchId !== lastFetchId) {
				// for fetch callback order
				return;
			}
			if (response && response.data && response.data.data) {
				setHosts(response.data.data);
				setFetchingHosts(false);
			} else {
				console.log('fetchHostsFunc error!');
			}
		})
			.catch(function (error) {
				console.error(error);
			});
	};
	const fetchHosts = debounce(fetchHostsFunc, 800);

	const handleHostChange = value => {
		setValue([]);
		setHosts([]);
		setFetchingHosts(false);
	};
	
	const onChangeFunc = (value, event) => {
		setCmdExpand(false);
		if (event.props.command_line.includes("check_snmp")) {
			if (form.getFieldsValue().host_name.length == 0) {
				notification['error']({
					message: 'Error',
					description: 'Please select a host.',
				});
				return;
			} else if (form.getFieldsValue().host_name.length > 1) {
				notification['error']({
					message: 'Error',
					description: 'Please select only a host.',
				});
				return;
			}
			const data = {
				host_name: form.getFieldsValue().host_name[0].key
			}
			setCheckCommandParam('-1');
			getSnmpTypeServices(data);
			setCmdExpand(true);
		} else {
			setCheckCommandParam('');
		}
	}

	const onChangeSnmpTypeFunc = (value, event) => {
		setSnmptrafficExpand(false);
		if (value.indexOf("check_snmp_traffic", 0) == 0) {
			if (form.getFieldsValue().host_name.length == 0) {
				notification['error']({
					message: 'Error',
					description: 'Please select a host.',
				});
				return;
			} else if (form.getFieldsValue().host_name.length > 1) {
				notification['error']({
					message: 'Error',
					description: 'Please select only a host.',
				});
				return;
			}
			const data = {
				host_name: form.getFieldsValue().host_name[0].key,
				snmp_type: "snmp_traffic"
			}
			setCheckCommandParam('-1');
			getSnmpTrafficServices(data);
			setCmdExpand(true);
			setSnmptrafficExpand(true);
		} else {
			setCheckCommandParam('');
		}
	}

	const onChangeUME = (checkedValues) => {
		setSelectedCheckTraffic(checkedValues);
	}

	const getServices = () => {
		setLoadingServices(true);
		serviceActions.getServices().then((response) => {
			setLoadingServices(false);
			if (response && response.data && response.data.data) {
				dispatch({ type: 'UPDATE_SERVICES', payload: response.data.data.map((data, i) => { return { ...data, no: i + 1 } }) });
			} else {
				notification['error']({
					message: 'Error',
					description: response.data.msg ? response.data.msg : 'Failed to add service data!',
				});
			}
		});
	}

	const getSnmpTypeServices = (data) => {
		setLoadingServices(true);
		serviceActions.getSnmpTypeService(data).then((response) => {
			setLoadingServices(false);
			if (response && response.data && response.data.data) {
				dispatch({ type: 'UPDATE_SNMPTYPES', payload: response.data.data.map((data, i) => { return { ...data, no: i + 1 } }) });

				if (serviceIdEditing && serviceIdEditing > 0) {
					const service = store.services.find(obj => obj.id == serviceIdEditing);
					form.setFieldsValue({
						type_name: service.snmp_type
					});

					if (service.snmp_type == "snmp_traffic") {
						// form.setFieldsValue({
						// 	type_alias: response.data.data[parseInt(service.snmp_option)-1].type_alias
						// });
						
						const data = {
							host_name: form.getFieldsValue().host_name[0].key,
							snmp_type: "snmp_traffic"
						}
						getSnmpTrafficServices(data);
						setSnmptrafficExpand(true);
					} else {
						setSnmptrafficExpand(false);
					}
				}
			} else {
				notification['error']({
					message: 'Error',
					description: response.data.msg ? response.data.msg : 'Failed to get SNMP type data!',
				});
			}
		});
	}

	const getSnmpTrafficServices = (data) => {
		setLoadingSnmp(true);
		serviceActions.getSnmpTrafficService(data).then((response) => {
			setLoadingSnmp(false);
			if (response && response.data && response.data.data) {
				let data = response.data.data;
				for (let i = 0; i < data.length; i++) {
					data[i]['key'] = i;
				}
				setTrafficData(data);

				if (serviceIdEditing && serviceIdEditing > 0) {
					const service = store.services.find(obj => obj.id == serviceIdEditing);
					const options = service.snmp_option.split(",");
					const optionsList = [];
					// Convert string to int array
					for (let i = 0; i < options.length; i++) {
						optionsList.push(parseInt(options[i]) - 1);
					}

					setSelectedRowKeysTraffic(optionsList);
				}
			} else {
				setLoadingSnmp(false);
				notification['error']({
					message: 'Error',
					description: response.data.msg ? response.data.msg : 'Failed to get SNMP Interface data!',
				});
			}
		});
	}

	const reloadServiceGroups = () => {
		serviceGroupActions.getServiceGroups().then((response) => {
			if (response && response.data && response.data.data) {
				dispatch({ type: 'UPDATE_SERVICEGROUPS', payload: response.data.data.map((data, i) => { return { ...data, no: i + 1 } }) });
			} else {
				console.error(response.data.msg ? response.data.msg : 'Failed to add servicegroup data!');
			}
		})
			.catch(function (error) {
				console.error(error);
			});
	}

	const reloadContacts = () => {
		contactActions.getContacts().then((response) => {
			if (response && response.data && response.data.data) {
				dispatch({type:'UPDATE_CONTACTS', payload: response.data.data.map((data, i) => { return { ...data, no: i + 1 } })});
			} else {
				console.error(response.data.msg ? response.data.msg : 'Failed to get contacts data!');
			}
		});
	}

	const reloadContactGroups = () => {
		contactGroupActions.getContactGroups().then((response) => {
			if (response && response.data && response.data.data) {
				dispatch({ type: 'UPDATE_CONTACTGROUPS', payload: response.data.data.map((data, i) => { return { ...data, no: i + 1 } }) });
			} else {
				console.error(response.data.msg ? response.data.msg : 'Failed to get contactgroups data!');
			}
		})
			.catch(function (error) {
				console.error(error);
			});
	}

	const deleteService = (serviceId) => {
		const service = store.services.find(obj => obj.id == serviceId);
		setLoadingGlobal(true);
		serviceActions.deleteService(serviceId).then((response) => {
			setLoadingGlobal(false);
			if (response.data.error && response.data.error === true) {
				notification['error']({
					message: 'Error!',
					description: response.data.msg ? response.data.msg : `Failed to delete "${service.service_description}" service!`,
				});
			} else {
				notification['success']({
					message: 'Success',
					description: `Succeed to delete "${service.service_description}" service.`,
				});
				getServices();
				reloadServiceGroups();
			}
		})
			.catch(function (error) {
				notification['error']({
					message: 'Error!',
					description: error.message,
				});
			});
	}

	const onSelectChangeTraffic = selectedRowKeysTraffic => {
		let ifname_list = [];
		for (let i = 0; i < selectedRowKeysTraffic.length; i++) {
			for (let j = 0; j < trafficData.length; j++) {
				let data = trafficData[j];
				if (data.key == selectedRowKeysTraffic[i]) {
					ifname_list.push(data.ifname);
				}
			}
		}
		setSelectedRowKeysTraffic(selectedRowKeysTraffic);
		setSelectedIFNamesTraffic(ifname_list);
  };

	const handleOk = (e) => {
		e.preventDefault();
		form.validateFieldsAndScroll((err, values) => {
			if (!err) {
				setSubmitting(true);

				let selectedIfList = [];
				let selectedCheckList = [];
				if (selectedRowKeysTraffic.length == 0 && snmptrafficExpand) {
					notification['error']({
						message: 'Error',
						description: 'Please select the interfaces!',
					});
					setSubmitting(false);
					return;
				} else {
					for (let i = 0; i < selectedRowKeysTraffic.length; i++) {
						selectedIfList.push(selectedRowKeysTraffic[i] + 1);
					}
				}

				if (values.check_command_pre == "check_snmp_traffic") {
					selectedCheckList.push('ifUcastPkts');
					selectedCheckList.push('ifMulticastPkts');
					selectedCheckList.push('ifErrors');
				} else if (values.check_command_pre == "check_snmp_traffic_bw") {
					selectedCheckList = [];
				} else if (values.check_command_pre == "check_snmp_traffic_unicast") {
					selectedCheckList.push('ifUcastPkts');
				} else if (values.check_command_pre == "check_snmp_traffic_multicast") {
					selectedCheckList.push('ifMulticastPkts');
				} else if (values.check_command_pre == "check_snmp_traffic_errors") {
					selectedCheckList.push('ifErrors');
				}

				if (serviceIdEditing && serviceIdEditing > 0) {
					// Edit the instance
					if (selectedRowKeysTraffic.length > 1) {
						notification['error']({
							message: 'Error',
							description: 'Please select only a interface!',
						});
						setSubmitting(false);
						return;
					}

					let snmmptype = "";
					if (values.check_command_pre.indexOf("check_snmp_traffic", 0) == 0) {
						snmmptype = "snmp_traffic";
					}

					const data = {
						...values,
						id: serviceIdEditing,
						host_name: values.host_name.map(d => d.label),
						snmp_type: snmmptype,
						snmp_option: selectedIfList,
						snmp_ifname: selectedIFNamesTraffic,
						snmp_check: selectedCheckList
					};
					serviceActions.updateService(data).then((response) => {
						setSubmitting(false);
						if (response.data.error && response.data.error === true) {
							notification['error']({
								message: 'Error',
								description: response.data.msg ? response.data.msg : 'Failed to update service data!',
							});
						} else {
							notification['success']({
								message: 'Success',
								description: 'Succeed to update service data.',
							});
							setServiceIdEditing(-1);
							setShowingEditModal(false);
							getServices();
							reloadServiceGroups();
						}
					})
						.catch(function (error) {
							notification['error']({
								message: 'Error!',
								description: error.message,
							});
						});

				} else {
					// Add new instance
					let snmmptype = ""
					if (values.check_command_pre.indexOf("check_snmp_traffic", 0) == 0) {
						snmmptype = "snmp_traffic";
					}

					const data = {
						...values,
						id: serviceIdEditing,
						host_name: values.host_name.map(d => d.label),
						snmp_type: snmmptype,
						snmp_option: selectedIfList,
						snmp_ifname: selectedIFNamesTraffic,
						snmp_check: selectedCheckList
					};

					serviceActions.addService(data).then((response) => {
						setSubmitting(false);
						if (response.data.error && response.data.error === true) {
							notification['error']({
								message: 'Error',
								description: response.data.msg ? response.data.msg : 'Failed to add service data!',
							});
						} else {
							notification['success']({
								message: 'Success',
								description:
									'Succeed to add service data.',
							});
							setServiceIdEditing(-1);
							setShowingEditModal(false);
							getServices();
							reloadServiceGroups();
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

	const handleEdit = (serviceId) => {
		setServiceIdEditing(serviceId);
	};

	const handleAdd = () => {
		setServiceIdEditing(0);
	};

	const handleDelete = (serviceId) => {
		const service = store.services.find(obj => obj.id == serviceId);
		Modal.confirm({
			title: `Are you sure delete "${service.service_description}" service?`,
			okText: 'Yes',
			okType: 'danger',
			cancelText: 'No',
			onOk: () => deleteService(serviceId)
		});
	};

	const showEditModal = () => {
		setShowingEditModal(true);
		setExpand(false);
		if (serviceIdEditing && serviceIdEditing > 0) {
			const service = store.services.find(obj => obj.id == serviceIdEditing);
			form.setFieldsValue({
				...service,
				servicegroups: service.servicegroups ? service.servicegroups.split(',') : [],
				host_name: service.host_name && service.host_name.length > 0 ? service.host_name.split(',').map(d => ({
					key: d,
					label: d
				})) : [],
				cmdExpand: service.snmp_type && service.snmp_type.includes("snmp_traffic") ? setCmdExpand(true) : setCmdExpand(false),
				contacts: service.contacts ? service.contacts.split(',') : [],
				contact_groups: service.contact_groups ? service.contact_groups.split(',') : [],
				use: service.use ? service.use.split(',') : [],
				added_time: moment(service.added_time).format(dateFormat),
				modified_time: moment(service.modified_time).format(dateFormat),
				'warning_limit': service.__WARNING,
				'critical_limit': parseInt(service.__CRITICAL),
				// 'checkbox_group': service.snmp_check ? service.snmp_check.split(',') : []
			});

			if (service.snmp_type && service.snmp_type.includes("snmp_traffic")) {
				setCheckCommandParam('-1');
				const data = {
					host_name: form.getFieldsValue().host_name[0].key
				}
				getSnmpTypeServices(data);
			} else {
				setCheckCommandParam('');
			}
		} else {
			form.setFieldsValue({
				'service_description': '',
				'check_command_param': '',
				'check_command_pre': store.commands.length > 0 ? store.commands[0].command_name : '',
				'max_check_attempts': 5,
				'check_interval': 60,
				'retry_interval': 1,
				// 'type_alias': store.snmptypes.length > 0 ? store.snmptypes[0].type_alias: '',
				servicegroups:[],
				host_name: [],
				contacts: [],
				use: [],
				contact_groups: [],
				cmdExpand: setCmdExpand(false),
				snmptrafficExpand: setSnmptrafficExpand(false),
				// 'checkbox_group': [],
				'traffic_data': setSelectedRowKeysTraffic([]),
				'warning_limit': 100,
				'critical_limit': 200
			});
			setCheckCommandParam('');
		}
	};

	const handleCancel = () => {
		setServiceIdEditing(-1);
		setShowingEditModal(false);
	};

	const toggleAdvanced = () => {
		setExpand(!expand);
	}

	useEffect(() => {
		getServices();
		reloadContacts();
		reloadContactGroups();
	}, []);

	useEffect(() => {
		if (serviceIdEditing >= 0) {
			showEditModal();
		}
	}, [serviceIdEditing]);

	let serviceEditing = null;
	if (serviceIdEditing && serviceIdEditing > 0) {
		serviceEditing = store.services.find(obj => obj.id == serviceIdEditing);
	}

	const handleCopy = (serviceId) => {
		const service = store.services.find(obj => obj.id == serviceId);
		const rowVal = {
			...service, 
			service_description: `Copy of ${service.service_description}`, 
		}
		setNewService({ 
			...rowVal, 
			id: -1 
		});
		setServiceIdInlineEditing(-1);
		setCopyId(service.id);
		form.setFieldsValue({
			...rowVal,
			servicegroups: rowVal.servicegroups ? rowVal.servicegroups.split(',') : [],
			host_name: rowVal.host_name ? rowVal.host_name.split(',') : [],
		});
	};

	const handleSave = (form, key) => {
    form.validateFields((error, row) => {
			if (error && 'service_description' in error) {
        return;
			}
			const service = store.services.find(obj => obj.id == copyId);
			const data = {
				...service,
				...row,
				contacts: service.contacts ? service.contacts.split(',') : [],
				contact_groups: service.contact_groups ? service.contact_groups.split(',') : [],
			}
			setLoadingGlobal(true);
			serviceActions.addService(data).then((response) => {
				setLoadingGlobal(false);
				if (response.data.error && response.data.error === true) {
					notification['error']({
						message: 'Error',
						description: response.data.msg ? response.data.msg : 'Failed to add service data!',
					});
				} else {
					notification['success']({
						message: 'Success',
						description:
							'Succeed to add service data.',
					});
					setNewService(null)
					setServiceIdInlineEditing('');
					setCopyId(null);
					getServices();
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
		setNewService(null)
		setServiceIdInlineEditing('');
		setCopyId(null);
  };

	const onPageChange = (page, pageSize) => {
		setCurrentPage(page);
	}

	const isEditing = record => record.id === serviceIdInlineEditing;

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
		// { title: 'No', dataIndex: 'no', className: 'textCenter', width: 60, key: 'id' },
		{
			title: 'Hosts', 
			dataIndex: 'host_name', 
			editable: true, 
			className: 'textCenter', 
			width: '35%', 
			key: 'host_name', 
			inputType: 'remotehost', 
			...getColumnSearchProps('host_name'),
			sorter: stringSorter('host_name')
		},
		{
			title: 'Description', 
			dataIndex: 'service_description', 
			editable: true, 
			className: 'textCenter', 
			width: '15%', 
			key: 'service_description',
			rules: [{ required: true, message: 'Please input Description!' }], 
			...getColumnSearchProps('service_description'), 
			sorter: stringSorter('service_description')
		},
		{
			title: 'Check Command', 
			dataIndex: 'check_command', 
			editable: true, 
			className: 'textCenter', 
			width: '20%', 
			key: 'check_command', 
			inputType: 'select', 
			items: store.commands.map(d => d.command_name),
			rules: [{ required: true, message: 'Please select Check command!' }],
			...getColumnFilterProps(false, store.commands.map(d => d.command_name), 'check_command'),
			sorter: stringSorter('host_name')
		},
		{
			title: 'Service Groups',
			dataIndex: 'servicegroups',
			editable: true,
			className: 'textCenter',
			width: '10%',
			key: 'servicegroups',
			inputType: 'multiselect',
			items: store.serviceGroups.map(d => d.servicegroup_name),
			rules: [{ type: 'array' }],
			...getColumnFilterProps(true, store.serviceGroups.map(d => d.servicegroup_name), 'servicegroups'),
			sorter: stringSorter('host_name')
		},
		{
			title: 'Actions', 
			dataIndex: '', 
			className: 'textCenter', 
			width: '20%', 
			render: (text, record) => {
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
						<Button type="primary" style={{ ...buttonStyle, marginRight: 10 }} disabled={serviceIdInlineEditing !== ''} onClick={() => handleEdit(record.id)} >
							<Icon type="edit" style={navIconStyle} />Edit</Button>
						<Button type="secondary" style={{ ...buttonStyle, marginRight: 10 }} disabled={serviceIdInlineEditing !== ''} onClick={() => handleCopy(record.id)} >
							<Icon type="copy" style={navIconStyle} />Copy</Button>
						<Button style={{ ...buttonStyle }} disabled={serviceIdInlineEditing !== ''} onClick={() => handleDelete(record.id)} >
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
				inputType: col.inputType,
				dataIndex: col.dataIndex,
				title: col.title,
				editing: isEditing(record),
				items: col.items,
				rules: col.rules,
			}),
		};
	});

	const trafficColumns = [
		{
			title: 'Name',
			dataIndex: 'ifname',
			editable: true,
			className: 'textCenter',
			key: 'ifname',
			rules: [{ required: true, message: 'Please input Name!' }],
			...getColumnSearchProps('ifname'),
			sorter: stringSorter('ifname')
		},
		{
			title: 'Status',
			dataIndex: 'status',
			editable: true,
			className: 'textCenter',
			key: 'status',
			rules: [{ required: true, message: 'Please input status!' }],
			...getColumnSearchProps('status'),
			sorter: stringSorter('status')
		},
		{
			title: 'Speed',
			dataIndex: 'speed',
			editable: true,
			className: 'textCenter',
			key: 'speed',
			rules: [{ required: true, message: 'Please input speed!' }],
			...getColumnSearchProps('speed'),
			sorter: stringSorter('speed')
		},
		{
			title: 'Type',
			dataIndex: 'type',
			editable: true,
			className: 'textCenter',
			key: 'type',
			rules: [{ required: true, message: 'Please input type!' }],
			...getColumnSearchProps('type'),
			sorter: stringSorter('type')
		},
	];
	
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

	const rowSelectionTraffic = {
		selectedRowKeys: selectedRowKeysTraffic,
		onChange: onSelectChangeTraffic,
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
						{window.location.pathname.includes('app/admin') && (<Button type="primary" style={{ ...buttonStyle, float: "right", marginBottom: 10 }} onClick={handleAdd} disabled={serviceIdInlineEditing !== ''}>
							<Icon type="plus" style={navIconStyle} />Add New Service
						</Button>)}
						<EditableContext.Provider value={form}>
							<Table
								components={components}
								columns={columns}
								dataSource={newService ? [...store.services.slice(0, pageSize * (currentPage - 1)), newService, ...store.services.slice(pageSize * (currentPage - 1))] : store.services}
								bordered
								size='small'
								pagination={{ position: 'both', onChange: onPageChange }}
								loading={loadingServices}
								rowKey="id"
							/>
						</EditableContext.Provider>

						<Modal
							width={800}
							visible={showingEditModal}
							title={serviceIdEditing && serviceIdEditing > 0 ? "Edit Service" : "Add New Service"}
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
								<Form.Item label="Description">
									{getFieldDecorator('service_description', {
										rules: columns.find(c => c.dataIndex === 'service_description').rules,
									})(<Input disabled={serviceEditing} />)}
								</Form.Item>
								<Form.Item label="Hosts">
									{getFieldDecorator('host_name', {
										rules: [
											{ required: true, message: 'Please input Host names!' },
											{ type: 'array' }
										],
									})(
										<Select
											mode="multiple"
											labelInValue
											placeholder="Please input few letters to search hosts"
											notFoundContent={fetchingHosts ? <Spin size="small" /> : null}
											filterOption={false}
											onSearch={fetchHosts}
											onChange={handleHostChange}
											style={{ width: '100%' }}
										>
											{hosts.map(d => (
												<Option key={d.id} value={d.host_name}>{d.host_name}</Option>
											))}
										</Select>
									)}
								</Form.Item>

								<Form.Item label="Check Command">
									<Row >
										<div className="col-md-5">
											{getFieldDecorator('check_command_pre', {
												initialValue: store.commands.length > 0 ? store.commands[0].command_name : '',
												rules: columns.find(c => c.dataIndex === 'check_command').rules,
											})(
												<Select showSearch onSelect={(value, event) => onChangeSnmpTypeFunc(value, event)}>
													{store.commands.map(obj => <Select.Option key={obj.id} value={obj.command_name} command_line={obj.command_line}>{obj.command_name}</Select.Option>)}
												</Select>
											)}
										</div>
										<div className="col-md-7">
											{getFieldDecorator('check_command_param', {
											})(
												<Input disabled={checkCommandParam !== ''} />
											)}
										</div>
									</Row>
								</Form.Item>
								<div style={cmdExpand ? {} : { display : 'none' }}>
									{/* <Form.Item {...formItemLayoutWithOutLabel}>
										<Row >
											<div className="col-md-4">
												Select the SNMP type:
											</div>
											<div className="col-md-8">
												{getFieldDecorator('type_name', {
													initialValue: serviceIdEditing && serviceIdEditing > 0 ? "Edit Service" : store.snmptypes.length > 0 ? store.snmptypes[0].type_name : '',
												})(
													<Select showSearch onSelect={(value, event) => onChangeSnmpTypeFunc(value, event)}>
														{store.snmptypes.map(obj => <Select.Option key={obj.id} value={obj.type_name}>{obj.type_alias}</Select.Option>)}
													</Select>
												)}
											</div>
										</Row>
									</Form.Item> */}
									<div style={snmptrafficExpand ? {} : { display : 'none' }}>
										<Form.Item {...formItemLayoutWithOutLabel}>
											<Form.Item label="">
												{getFieldDecorator('traffic_data', {
													initialValue: [],
												})(
													<div className="col-md-12">
														<Table rowSelection={rowSelectionTraffic} columns={trafficColumns} dataSource={trafficData} loading={loadingSnmp} style={{ width: '100% '}}/>
													</div>
												)}
											</Form.Item>

											<Row style={{ marginBottom: '10px'}}>
												<div className="col-md-4">
													Warning Threshold (MB):
												</div>
												<div className="col-md-8">
													{getFieldDecorator('warning_limit', {
														initialValue: 100,
														rules: [{ validator: checkNumber }]
													})(<Input />)}
												</div>
											</Row>

											<Row style={{ marginBottom: '10px'}}>
												<div className="col-md-4">
													Critical Threshold (MB):
												</div>
												<div className="col-md-8">
													{getFieldDecorator('critical_limit', {
														initialValue: 200,
														rules: [{ validator: checkNumber }]
													})(<Input />)}
												</div>
											</Row>
												
											{/* <Form.Item label="">
											{getFieldDecorator('checkbox_group', {
												initialValue: [],
											})(
											<Checkbox.Group style={{ width: '100%' }} onChange={onChangeUME} value={selectedCheckTraffic}>
												<Row>
													<Col span={24} style={{ marginBottom: '10px'}} >
														<Checkbox value="ifUcastPkts">Unicast Packets In & Out</Checkbox>
													</Col>
												</Row>
												<Row>
													<Col span={24} style={{ marginBottom: '10px'}} >
														<Checkbox value="ifMulticastPkts">Multicast Packets In & Out</Checkbox>
													</Col>
												</Row>
												<Row>
													<Col span={24}>
														<Checkbox value="ifErrors">Errors In & Out</Checkbox>
													</Col>
												</Row>
											</Checkbox.Group>
											)}
											</Form.Item> */}
										</Form.Item>
									</div>
								</div>
								<Form.Item label="Service Groups">
									{getFieldDecorator('servicegroups', {
										rules: columns.find(c => c.dataIndex === 'servicegroups').rules,
									})(
										<Select mode="multiple" placeholder="Please select Service Groups!">
											{store.serviceGroups.map(obj => <Select.Option key={obj.id} value={obj.servicegroup_name}>{obj.servicegroup_name}</Select.Option>)}
										</Select>
									)}
								</Form.Item>
								<Button key="advanced" style={{ border: "none", marginBottom: 10 }} onClick={toggleAdvanced}>
									{expand ? 'Simple' : 'Advanced'} ...
            		</Button>
								<div style={expand ? {} : { display: 'none' }}>
									<Form.Item label="Contacts">
										{getFieldDecorator('contacts', {
											rules: [
												{ type: 'array' }
											],
										})(
											<Select mode="multiple" placeholder="Please select Contacts!">
												{store.contacts.map(obj => <Select.Option key={obj.id} value={obj.contact_name}>{obj.contact_name}</Select.Option>)}
											</Select>
										)}
									</Form.Item>
									<Form.Item label="Contact Groups">
										{getFieldDecorator('contact_groups', {
											rules: [
												{ type: 'array' }
											],
										})(
											<Select mode="multiple" placeholder="Please select contactgroups">
												{store.contactGroups.map(obj => <Select.Option key={obj.id} value={obj.contactgroup_name}>{obj.contactgroup_name}</Select.Option>)}
											</Select>
										)}
									</Form.Item>
									<Form.Item label="Use">
										{getFieldDecorator('use', {
											rules: [],
										})(
											<Select mode="multiple" placeholder="Please select service templates">
												{store.servicetemplates.map((obj, i) => <Select.Option value={obj.name} key={i}>{obj.name}</Select.Option>)}
											</Select>
										)}
									</Form.Item>
									<Form.Item label="Max Check Attempts">
										{getFieldDecorator('max_check_attempts', {
											initialValue: 5,
											rules: [{ validator: checkNumber }]
										})(<Input />)}
									</Form.Item>
									<Form.Item label="Check Interval(s)">
										{getFieldDecorator('check_interval', {
											initialValue: 60,
											rules: [{ validator: checkNumber }]
										})(<Input />)}
									</Form.Item>
									<Form.Item label="Retry Interval(m)">
										{getFieldDecorator('retry_interval', {
											initialValue: 1,
											rules: [{ validator: checkNumber }]
										})(<Input />)}
									</Form.Item>
									{serviceIdEditing && serviceIdEditing > 0 ? (
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

export default Form.create({ name: 'ServicesAdminForm' })(ServicesAdminForm);
