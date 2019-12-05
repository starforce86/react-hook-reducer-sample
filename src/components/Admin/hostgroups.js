// @flow
import * as React from 'react';
import { useContext, useState, useEffect, useRef } from 'react';
import { Container, Row, Col } from 'reactstrap';
import { Table, Modal, Button, Form, Input, Tooltip, Icon, notification, Switch, Checkbox, Select, Spin } from 'antd';
import moment from 'moment';
import debounce from 'lodash/debounce';
import Highlighter from 'react-highlight-words';
import { monitorActions } from '../../modules/Monitor';
import { contactActions } from '../../modules/Contact';
import { contactGroupActions } from '../../modules/ContactGroups';
import { hostgroupActions } from '../../modules/Hostgroups';
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

const HostgroupsAdminForm = props => {

	let { store, dispatch } = useContext(AppContext);
	const { form } = props;
	const { getFieldDecorator } = form;

	const [hosts, setHosts] = useState([]);
	const [value, setValue] = useState([]);
	const [fetchingHosts, setFetchingHosts] = useState(false);
	const [loadingGlobal, setLoadingGlobal] = useState(false);
	const [loadingHostgroups, setLoadingHostgroups] = useState(false);
	const [showingEditModal, setShowingEditModal] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [hostgroupIdEditing, setHostgroupIdEditing] = useState(-1);
	const [newHostgroup, setNewHostgroup] = useState(null);
	const [hostgroupIdInlineEditing, setHostgroupIdInlineEditing] = useState('');
	const [copyId, setCopyId] = useState(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [searchText, setSearchText] = useState(null);
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

	const getHostgroups = () => {
		setLoadingHostgroups(true);
		hostgroupActions.getHostgroups().then((response) => {
			setLoadingHostgroups(false);
			if (response && response.data && response.data.data) {
				dispatch({ type: 'UPDATE_HOSTGROUPS', payload: response.data.data.map((data, i) => { return { ...data, no: i + 1 } }) });
			} else {
				notification['error']({
					message: 'Error',
					description: response.data.msg ? response.data.msg : 'Failed to add hostgroup data!',
				});
			}
		});
	}

	const deleteHostgroup = (id) => {
		const hostgroup = store.hostgroups.find(obj => obj.id == id);
		setLoadingGlobal(true);
		hostgroupActions.deleteHostgroup(id).then((response) => {
			setLoadingGlobal(false);
			if (response.data.error && response.data.error === true) {
				notification['error']({
					message: 'Error!',
					description: response.data.msg ? response.data.msg : `Failed to delete "${hostgroup.hostgroup_name}" hostgroup!`,
				});
			} else {
				notification['success']({
					message: 'Success',
					description: `Succeed to delete "${hostgroup.hostgroup_name}" hostgroup.`,
				});
				getHostgroups();
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
				if (hostgroupIdEditing && hostgroupIdEditing > 0) {
					const data = {
						...values,
						id: hostgroupIdEditing,
						members: values.members.map(d => d.label)
					};
					console.log('Form Data: ', data)
					hostgroupActions.updateHostgroup(data).then((response) => {
						setSubmitting(false);
						if (response.data.error && response.data.error === true) {
							notification['error']({
								message: 'Error',
								description: response.data.msg ? response.data.msg : 'Failed to add hostgroup data!',
							});
						} else {
							notification['success']({
								message: 'Success',
								description: 'Succeed to update hostgroup data.',
							});
							setHostgroupIdEditing(-1);
							setShowingEditModal(false);
							getHostgroups();
						}
					})
						.catch(function (error) {
							notification['error']({
								message: 'Error!',
								description: error.message,
							});
						});
				} else {
					const data = {
						...values,
						id: hostgroupIdEditing,
						members: values.members.map(d => d.label)
					};
					console.log('Form Data: ', data)
					hostgroupActions.addHostgroup(data).then((response) => {
						setSubmitting(false);
						if (response.data.error && response.data.error === true) {
							notification['error']({
								message: 'Error',
								description: response.data.msg ? response.data.msg : 'Failed to add hostgroup data!',
							});
						} else {
							notification['success']({
								message: 'Success',
								description:
									'Succeed to add hostgroup data.',
							});
							setHostgroupIdEditing(-1);
							setShowingEditModal(false);
							getHostgroups();
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
		setHostgroupIdEditing(id);
	};

	const handleAdd = () => {
		setHostgroupIdEditing(0);
	};

	const handleDelete = (id) => {
		const hostgroup = store.hostgroups.find(obj => obj.id == id);
		Modal.confirm({
			title: `Are you sure delete "${hostgroup.hostgroup_name}" hostgroup?`,
			okText: 'Yes',
			okType: 'danger',
			cancelText: 'No',
			onOk: () => deleteHostgroup(id)
		});
	};

	const showEditModal = () => {
		setShowingEditModal(true);
		if (hostgroupIdEditing && hostgroupIdEditing > 0) {
			const hostgroup = store.hostgroups.find(obj => obj.id == hostgroupIdEditing);
			form.setFieldsValue({
				...hostgroup,
				members: hostgroup.members && hostgroup.members.length > 0 ? hostgroup.members.split(',').map(d => ({
					key: d,
					label: d
				})) : [],
				added_time: moment(hostgroup.added_time).format(dateFormat),
				modified_time: moment(hostgroup.modified_time).format(dateFormat)
			});
		} else {
			form.setFieldsValue({
				'hostgroup_name': '',
				'alias': '',
				members: []
			});
		}
	};

	const handleCancel = () => {
		setHostgroupIdEditing(-1);
		setShowingEditModal(false);
	};

	useEffect(() => {
		getHostgroups();
	}, []);

	useEffect(() => {
		if (hostgroupIdEditing >= 0) {
			showEditModal();
		}
	}, [hostgroupIdEditing]);

	let hostgroupEditing = null;
	if (hostgroupIdEditing && hostgroupIdEditing > 0) {
		hostgroupEditing = store.hostgroups.find(obj => obj.id == hostgroupIdEditing);
	}

	const handleCopy = (hostgroupId) => {
		const hostgroup = store.hostgroups.find(obj => obj.id == hostgroupId);
		const rowVal = {
			...hostgroup, 
			hostgroup_name: `Copy of ${hostgroup.hostgroup_name}`, 
		}
		setNewHostgroup({ 
			...rowVal, 
			id: -1 
		});
		setHostgroupIdInlineEditing(-1);
		setCopyId(hostgroup.id);
		form.setFieldsValue({
			...rowVal,
		});
	};

	const handleSave = (form, key) => {
    form.validateFields((error, row) => {
			if (error && 'hostgroup_name' in error) {
        return;
			}
			const hostgroup = store.hostgroups.find(obj => obj.id == copyId);
			const data = {
				...hostgroup,
				...row,
				members: []
			}
			setLoadingGlobal(true);
			hostgroupActions.addHostgroup(data).then((response) => {
				setLoadingGlobal(false);
				if (response.data.error && response.data.error === true) {
					notification['error']({
						message: 'Error',
						description: response.data.msg ? response.data.msg : 'Failed to add host group data!',
					});
				} else {
					notification['success']({
						message: 'Success',
						description:
							'Succeed to add host group data.',
					});
					setNewHostgroup(null)
					setHostgroupIdInlineEditing('');
					setCopyId(null);
					getHostgroups();
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
		setNewHostgroup(null)
		setHostgroupIdInlineEditing('');
		setCopyId(null);
  };

	const onPageChange = (page, pageSize) => {
		setCurrentPage(page);
	}

	const isEditing = record => record.id === hostgroupIdInlineEditing;

	const handleSearch = (selectedKeys, confirm) => {
    confirm();
		setSearchText(selectedKeys[0]);
  };

  const handleReset = clearFilters => {
		clearFilters();
		setSearchText('');
	};

	const searchInputRef = useRef();
	
	const getColumnSearchProps = (dataIndex) => ({
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
			title: 'Host Group Name',
			dataIndex: 'hostgroup_name',
			editable: true,
			className: 'textCenter',
			width: 300,
			key: 'hostgroup_name',
			rules: [
				{ required: true, message: 'Please input Host Group Name!' }
			],
			...getColumnSearchProps('hostgroup_name'),
			sorter: stringSorter('hostgroup_name')
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
						<Button type="primary" style={{ ...buttonStyle, marginRight: 10 }} disabled={hostgroupIdInlineEditing !== ''} onClick={() => handleEdit(record.id)} >
							<Icon type="edit" style={navIconStyle} />Edit</Button>
						<Button type="secondary" style={{ ...buttonStyle, marginRight: 10 }} disabled={hostgroupIdInlineEditing !== ''} onClick={() => handleCopy(record.id)} >
							<Icon type="copy" style={navIconStyle} />Copy</Button>
						<Button style={{ ...buttonStyle }} disabled={hostgroupIdInlineEditing !== ''} onClick={() => handleDelete(record.id)} >
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
						<Button type="primary" style={{ ...buttonStyle, float: "right", marginBottom: 10 }} onClick={handleAdd} disabled={hostgroupIdInlineEditing !== ''}>
							<Icon type="plus" style={navIconStyle} />Add New Host Group
        		</Button>
						<EditableContext.Provider value={form}>
							<Table
								components={components}
								columns={columns}
								dataSource={newHostgroup ? [...store.hostgroups.slice(0, pageSize * (currentPage - 1)), newHostgroup, ...store.hostgroups.slice(pageSize * (currentPage - 1))] : store.hostgroups}
								bordered
								size='small'
								pagination={{ position: 'both', onChange: onPageChange }}
								loading={loadingHostgroups}
								rowKey="id"
							/>
						</EditableContext.Provider>
						
						<Modal
							width={800}
							visible={showingEditModal}
							title={hostgroupIdEditing && hostgroupIdEditing > 0 ? "Edit Host Group" : "Add New Host Group"}
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
									{getFieldDecorator('hostgroup_name', {
										rules: columns.find(c => c.dataIndex === 'hostgroup_name').rules,
									})(<Input disabled={hostgroupEditing} />)}
								</Form.Item>
								<Form.Item label="Alias">
									{getFieldDecorator('alias', {
										rules: columns.find(c => c.dataIndex === 'alias').rules,
									})(<Input />)}
								</Form.Item>
								<Form.Item label="Hosts">
									{getFieldDecorator('members', {
										rules: [
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
												<Option key={d.host_name} value={d.host_name}>{d.host_name}</Option>
											))}
										</Select>
									)}
								</Form.Item>
								{hostgroupIdEditing && hostgroupIdEditing > 0 ? (
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

export default Form.create({ name: 'HostgroupsAdminForm' })(HostgroupsAdminForm);
