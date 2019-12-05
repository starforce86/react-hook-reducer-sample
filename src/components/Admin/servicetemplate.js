// @flow
import * as React from 'react';
import { useContext, useState, useEffect, useRef } from 'react';
import { Container, Row, Col } from 'reactstrap';
import { Table, Modal, Button, Form, Input, Tooltip, Icon, notification, Switch, Checkbox, Select, Spin } from 'antd';
import moment from 'moment';
import debounce from 'lodash/debounce';
import Highlighter from 'react-highlight-words';
import { monitorActions } from '../../modules/Monitor';
import { serviceActions } from '../../modules/Services';
import { serviceTemplateActions } from '../../modules/ServiceTemplate';
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
					{(items ? items : []).map((d, i) => <Select.Option value={d} key={i}>{d}</Select.Option>)}
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

const ServiceTemplatesAdminForm = props => {

	let { store, dispatch } = useContext(AppContext);
	const { form } = props;
	const { getFieldDecorator } = form;

	const [loadingGlobal, setLoadingGlobal] = useState(false);
	const [loadingServices, setLoadingServices] = useState(false);
	const [showingEditModal, setShowingEditModal] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [serviceTemplateIdEditing, setServiceTemplateIdEditing] = useState(-1);
	const [expand, setExpand] = useState(false);
	const [newServiceTemplate, setNewServiceTemplate] = useState(null);
	const [serviceTemplateIdInlineEditing, setServiceTemplateIdInlineEditing] = useState('');
	const [copyId, setCopyId] = useState(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [searchText, setSearchText] = useState(null);
	const pageSize = 10;
	let lastFetchId = 0;
	
	notification.config({
		placement: 'bottomRight',
	});

	const getServiceTemplates = () => {
		setLoadingServices(true);
		serviceTemplateActions.getServiceTemplates().then((response) => {
			setLoadingServices(false);
			if (response && response.data && response.data.data) {
				dispatch({ type: 'UPDATE_SERVICETEMPLATES', payload: response.data.data.map((data, i) => { return { ...data, no: i + 1 } }) });
			} else {
				notification['error']({
					message: 'Error',
					description: response.data.msg ? response.data.msg : 'Failed to add service template data!',
				});
			}
		});
	}

	const reloadService = () => {
		serviceActions.getServices().then((response) => {
			setLoadingServices(false);
			if (response && response.data && response.data.data) {
				dispatch({ type: 'UPDATE_SERVICES', payload: response.data.data.map((data, i) => { return { ...data, no: i + 1 } }) });
			} else {
				notification['error']({
					message: 'Error',
					description: response.data.msg ? response.data.msg : 'Failed to add service template data!',
				});
			}
		});
	}

	const deleteServiceTemplate = (serviceTemplateId) => {
		const servicetemplate = store.servicetemplates.find(obj => obj.id == serviceTemplateId);
		setLoadingGlobal(true);
		serviceTemplateActions.deleteServiceTemplate(serviceTemplateId).then((response) => {
			setLoadingGlobal(false);
			if (response.data.error && response.data.error === true) {
				notification['error']({
					message: 'Error!',
					description: response.data.msg ? response.data.msg : `Failed to delete "${servicetemplate.name}" service template!`,
				});
			} else {
				notification['success']({
					message: 'Success',
					description: `Succeed to delete "${servicetemplate.name}" service template.`,
				});
				getServiceTemplates();
				reloadService();
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
				if (serviceTemplateIdEditing && serviceTemplateIdEditing > 0) {
					const data = {
						...values,
						id: serviceTemplateIdEditing
					};
					serviceTemplateActions.updateServiceTemplate(data).then((response) => {
						setSubmitting(false);
						if (response.data.error && response.data.error === true) {
							notification['error']({
								message: 'Error',
								description: response.data.msg ? response.data.msg : 'Failed to update service template data!',
							});
						} else {
							notification['success']({
								message: 'Success',
								description: 'Succeed to update service template data.',
							});
							setServiceTemplateIdEditing(-1);
							setShowingEditModal(false);
							getServiceTemplates();
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
						id: serviceTemplateIdEditing
					};
					serviceTemplateActions.addServiceTemplate(data).then((response) => {
						setSubmitting(false);
						if (response.data.error && response.data.error === true) {
							notification['error']({
								message: 'Error',
								description: response.data.msg ? response.data.msg : 'Failed to add service template data!',
							});
						} else {
							notification['success']({
								message: 'Success',
								description:
									'Succeed to add service template data.',
							});
							setServiceTemplateIdEditing(-1);
							setShowingEditModal(false);
							getServiceTemplates();
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

	const handleEdit = (serviceTemplateId) => {
		setServiceTemplateIdEditing(serviceTemplateId);
	};

	const handleAdd = () => {
		setServiceTemplateIdEditing(0);
	};

	const handleDelete = (serviceTemplateId) => {
		const servicetemplate = store.servicetemplates.find(obj => obj.id == serviceTemplateId);
		Modal.confirm({
			title: `Are you sure delete "${servicetemplate.name}" service template?`,
			okText: 'Yes',
			okType: 'danger',
			cancelText: 'No',
			onOk: () => deleteServiceTemplate(serviceTemplateId)
		});
	};

	const showEditModal = () => {
		setShowingEditModal(true);
		setExpand(false);
		if (serviceTemplateIdEditing && serviceTemplateIdEditing > 0) {
			const servicetemplate = store.servicetemplates.find(obj => obj.id == serviceTemplateIdEditing);
			form.setFieldsValue({
				...servicetemplate,
				added_time: moment(servicetemplate.added_time).format(dateFormat),
				modified_time: moment(servicetemplate.modified_time).format(dateFormat)
			});
		} else {
			form.setFieldsValue({
				'name': '',
				'max_check_attempts': 5,
				'check_interval': 10,
				'retry_interval': 5,
				'retry_check_interval': 5,
				'normal_check_interval': 10
			});
		}
	};

	const handleCancel = () => {
		setServiceTemplateIdEditing(-1);
		setShowingEditModal(false);
	};

	const toggleAdvanced = () => {
		setExpand(!expand);
	}

	useEffect(() => {
		getServiceTemplates();
	}, []);

	useEffect(() => {
		if (serviceTemplateIdEditing >= 0) {
			showEditModal();
		}
	}, [serviceTemplateIdEditing]);

	let serviceTemplateEditing = null;
	if (serviceTemplateIdEditing && serviceTemplateIdEditing > 0) {
		serviceTemplateEditing = store.servicetemplates.find(obj => obj.id == serviceTemplateIdEditing);
	}

	const handleCopy = (serviceTemplateId) => {
		const servicetemplate = store.servicetemplates.find(obj => obj.id == serviceTemplateId);
		const rowVal = {
			...servicetemplate, 
			name: `Copy of ${servicetemplate.name}`, 
		}
		setNewServiceTemplate({ 
			...rowVal, 
			id: -1 
		});
		setServiceTemplateIdInlineEditing(-1);
		setCopyId(servicetemplate.id);
		form.setFieldsValue({
			...rowVal,
		});
	};

	const handleSave = (form, key) => {
    form.validateFields((error, row) => {
			if (error && 'name' in error) {
        return;
			}
			const servicetemplate = store.servicetemplates.find(obj => obj.id == copyId);
			const data = {
				...servicetemplate,
				...row,
			}
			setLoadingGlobal(true);
			serviceTemplateActions.addServiceTemplate(data).then((response) => {
				setLoadingGlobal(false);
				if (response.data.error && response.data.error === true) {
					notification['error']({
						message: 'Error',
						description: response.data.msg ? response.data.msg : 'Failed to add service template data!',
					});
				} else {
					notification['success']({
						message: 'Success',
						description:
							'Succeed to add service template data.',
					});
					setNewServiceTemplate(null)
					setServiceTemplateIdInlineEditing('');
					setCopyId(null);
					getServiceTemplates();
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
		setNewServiceTemplate(null)
		setServiceTemplateIdInlineEditing('');
		setCopyId(null);
  };

	const onPageChange = (page, pageSize) => {
		setCurrentPage(page);
	}

	const isEditing = record => record.id === serviceTemplateIdInlineEditing;

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
			inputType: 'remotehost', 
			...getColumnSearchProps('name'),
			sorter: stringSorter('name')
		},
		{
			title: 'Max Check Attempts',
			dataIndex: 'max_check_attempts',
			editable: true,
			className: 'textCenter',
			width: 200, key: 'max_check_attempts',
			...getColumnSearchProps('max_check_attempts'),
			sorter: stringSorter('max_check_attempts')
		},
		{
			title: 'Check Interval',
			dataIndex: 'check_interval',
			editable: true,
			className: 'textCenter',
			width: 200, key: 'check_interval',
			...getColumnSearchProps('check_interval'),
			sorter: stringSorter('check_interval')
		},
		{
			title: 'Retry Interval',
			dataIndex: 'retry_interval',
			editable: true,
			className: 'textCenter',
			width: 200, key: 'retry_interval',
			...getColumnSearchProps('retry_interval'),
			sorter: stringSorter('retry_interval')
		},
		{
			title: 'Check Period',
			dataIndex: 'check_period',
			editable: true,
			className: 'textCenter',
			width: 200,
			key: 'check_period',
			inputType: 'select',
			items: store.timeperiods.map(d => d.name),
			...getColumnFilterProps(false, store.timeperiods.map(d => d.name), 'check_period'),
			sorter: stringSorter('check_period')
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
						<Button type="primary" style={{ ...buttonStyle, marginRight: 10 }} disabled={serviceTemplateIdInlineEditing !== ''} onClick={() => handleEdit(record.id)} >
							<Icon type="edit" style={navIconStyle} />Edit</Button>
						<Button type="secondary" style={{ ...buttonStyle, marginRight: 10 }} disabled={serviceTemplateIdInlineEditing !== ''} onClick={() => handleCopy(record.id)} >
							<Icon type="copy" style={navIconStyle} />Copy</Button>
						<Button style={{ ...buttonStyle }} disabled={serviceTemplateIdInlineEditing !== ''} onClick={() => handleDelete(record.id)} >
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
						{window.location.pathname.includes('app/admin') && (<Button type="primary" style={{ ...buttonStyle, float: "right", marginBottom: 10 }} onClick={handleAdd} disabled={serviceTemplateIdInlineEditing !== ''}>
							<Icon type="plus" style={navIconStyle} />Add New Service Template
						</Button>)}
						<EditableContext.Provider value={form}>
							<Table
								components={components}
								columns={columns}
								dataSource={newServiceTemplate ? [...store.servicetemplates.slice(0, pageSize * (currentPage - 1)), newServiceTemplate, ...store.servicetemplates.slice(pageSize * (currentPage - 1))] : store.servicetemplates}
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
							title={serviceTemplateIdEditing && serviceTemplateIdEditing > 0 ? "Edit Service Template" : "Add New Service Template"}
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
									})(<Input disabled={serviceTemplateEditing} />)}
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
								<Form.Item label="Check Period">
										{getFieldDecorator('check_period', {
												initialValue: store.timeperiods.length > 0 ? store.timeperiods[0].name : '',
												rules: [],
										})(
												<Select>
														{store.timeperiods.map((val, i) => <Select.Option value={val.name} key={i}>{val.name}</Select.Option>)}
												</Select>
										)}
								</Form.Item>
								<Form.Item label="Retry Check Interval">
									{getFieldDecorator('retry_check_interval', {
										initialValue: 1,
										rules: [{ validator: checkNumber }]
									})(<Input />)}
								</Form.Item>
								<Form.Item label="Normal Retry Interval">
									{getFieldDecorator('normal_check_interval', {
										initialValue: 1,
										rules: [{ validator: checkNumber }]
									})(<Input />)}
								</Form.Item>
							</Form>
						</Modal>
					</Col>
				</Row>
			</Spin>
		</Container>
	)
}

export default Form.create({ name: 'ServiceTemplatesAdminForm' })(ServiceTemplatesAdminForm);
