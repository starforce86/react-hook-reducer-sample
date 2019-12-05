// @flow
import * as React from 'react';
import { useContext, useState, useEffect, useRef } from 'react';
import { Container, Row, Col } from 'reactstrap';
import { Table, Modal, Button, Form, Input, Checkbox, Icon, notification, Spin, Select, DatePicker } from 'antd';
import moment from 'moment';
import Highlighter from 'react-highlight-words';
import { timeperiodActions } from '../../modules/Timeperiods';
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

const TimeperiodsAdminForm = props => {

	let { store, dispatch } = useContext(AppContext);
	const { form } = props;
	const { getFieldDecorator } = form;

	const [loadingGlobal, setLoadingGlobal] = useState(false);
	const [loadingTimeperiods, setLoadingTimeperiods] = useState(false);
	const [showingEditModal, setShowingEditModal] = useState(false);
	const [editSubmitting, setEditSubmitting] = useState(false);
	const [timeperiodIdEditing, setTimeperiodIdEditing] = useState(-1);
	const [newTimeperiod, setNewTimeperiod] = useState(null);
	const [timeperiodIdInlineEditing, setTimeperiodIdInlineEditing] = useState('');
	const [copyId, setCopyId] = useState(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [searchText, setSearchText] = useState(null);
	const pageSize = 10;

	notification.config({ placement: 'bottomRight' });

	const getTimeperiods = () => {
		setLoadingTimeperiods(true);
		timeperiodActions.getTimeperiods().then((response) => {
			setLoadingTimeperiods(false);
			if (response && response.data && response.data.data) {
				dispatch({type:'UPDATE_TIMEPERIODS', payload: response.data.data.map((data, i) => { return { ...data, no: i + 1 } })});
			} else {
				notification['error']({
					message: 'Error',
					description: response.data.msg ? response.data.msg : 'Failed to get timeperiods data from server!',
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

	const deleteTimeperiod = (id) => {
		const timeperiod = store.timeperiods.find(obj => obj.id == id);
		setLoadingGlobal(true);
		timeperiodActions.deleteTimeperiod(id).then((response) => {
			setLoadingGlobal(false);
			if (response.data.error && response.data.error === true) {
				notification['error']({
					message: 'Error!',
					description: response.data.msg ? response.data.msg : `Failed to delete "${timeperiod.name}" timerperiod!`,
				});
			} else {
				notification['success']({
					message: 'Success',
					description: `Succeed to delete "${timeperiod.name}" timerperiod.`,
				});
				getTimeperiods();
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
				if (timeperiodIdEditing && timeperiodIdEditing > 0) {
					const data = { ...values, id: timeperiodIdEditing };
					timeperiodActions.updateTimeperiod(data).then((response) => {
						setEditSubmitting(false);
						if (response.data.error && response.data.error === true) {
							notification['error']({
								message: 'Error',
								description: response.data.msg ? response.data.msg : 'Failed to update timeperiod data!',
							});
						} else {
							notification['success']({
								message: 'Success',
								description: 'Succeed to update timeperiod data.',
							});
							setTimeperiodIdEditing(-1);
							setShowingEditModal(false);
							getTimeperiods();
						}
					})
						.catch(function (error) {
							notification['error']({
								message: 'Error!',
								description: error.message,
							});
						});
				} else {
					timeperiodActions.addTimeperiod(values).then((response) => {
						setEditSubmitting(false);
						if (response.data.error && response.data.error === true) {
							notification['error']({
								message: 'Error!',
								description: response.data.msg ? response.data.msg : 'Failed to add timeperiod data!',
							});
						} else {
							notification['success']({
								message: 'Success',
								description: 'Succeed to add timeperiod data.',
							});
							setTimeperiodIdEditing(-1);
							setShowingEditModal(false);
							getTimeperiods();
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
		setTimeperiodIdEditing(id);
	};

	const handleAdd = () => {
		setTimeperiodIdEditing(0);
	};

	const handleDelete = (id) => {
		const timeperiod = store.timeperiods.find(obj => obj.id == id);
		Modal.confirm({
			title: `Are you sure delete "${timeperiod.name}" timeperiod?`,
			okText: 'Yes',
			okType: 'danger',
			cancelText: 'No',
			onOk: () => deleteTimeperiod(id),
		});
	};

	const showEditModal = () => {
		setShowingEditModal(true);
		if (timeperiodIdEditing && timeperiodIdEditing > 0) {
			const timeperiod = store.timeperiods.find(obj => obj.id == timeperiodIdEditing);
			form.setFieldsValue({
				...timeperiod,
				'dayofweek[0]': timeperiod.dayofweek_time["0"] ? true : false,
				'dayofweek[1]': timeperiod.dayofweek_time["1"] ? true : false,
				'dayofweek[2]': timeperiod.dayofweek_time["2"] ? true : false,
				'dayofweek[3]': timeperiod.dayofweek_time["3"] ? true : false,
				'dayofweek[4]': timeperiod.dayofweek_time["4"] ? true : false,
				'dayofweek[5]': timeperiod.dayofweek_time["5"] ? true : false,
				'dayofweek[6]': timeperiod.dayofweek_time["6"] ? true : false,
				'dayofweek_time[0].begin.hour': timeperiod.dayofweek_time["0"] ? timeperiod.dayofweek_time["0"]["begin_time_hour"] : "00",
				'dayofweek_time[0].begin.minute': timeperiod.dayofweek_time["0"] ? timeperiod.dayofweek_time["0"]["begin_time_minute"] : "00",
				'dayofweek_time[0].end.hour': timeperiod.dayofweek_time["0"] ? timeperiod.dayofweek_time["0"]["end_time_hour"] : "24",
				'dayofweek_time[0].end.minute': timeperiod.dayofweek_time["0"] ? timeperiod.dayofweek_time["0"]["end_time_minute"] : "00",
				'dayofweek_time[1].begin.hour': timeperiod.dayofweek_time["1"] ? timeperiod.dayofweek_time["1"]["begin_time_hour"] : "00",
				'dayofweek_time[1].begin.minute': timeperiod.dayofweek_time["1"] ? timeperiod.dayofweek_time["1"]["begin_time_minute"] : "00",
				'dayofweek_time[1].end.hour': timeperiod.dayofweek_time["1"] ? timeperiod.dayofweek_time["1"]["end_time_hour"] : "24",
				'dayofweek_time[1].end.minute': timeperiod.dayofweek_time["1"] ? timeperiod.dayofweek_time["1"]["end_time_minute"] : "00",
				'dayofweek_time[2].begin.hour': timeperiod.dayofweek_time["2"] ? timeperiod.dayofweek_time["2"]["begin_time_hour"] : "00",
				'dayofweek_time[2].begin.minute': timeperiod.dayofweek_time["2"] ? timeperiod.dayofweek_time["2"]["begin_time_minute"] : "00",
				'dayofweek_time[2].end.hour': timeperiod.dayofweek_time["2"] ? timeperiod.dayofweek_time["2"]["end_time_hour"] : "24",
				'dayofweek_time[2].end.minute': timeperiod.dayofweek_time["2"] ? timeperiod.dayofweek_time["2"]["end_time_minute"] : "00",
				'dayofweek_time[3].begin.hour': timeperiod.dayofweek_time["3"] ? timeperiod.dayofweek_time["3"]["begin_time_hour"] : "00",
				'dayofweek_time[3].begin.minute': timeperiod.dayofweek_time["3"] ? timeperiod.dayofweek_time["3"]["begin_time_minute"] : "00",
				'dayofweek_time[3].end.hour': timeperiod.dayofweek_time["3"] ? timeperiod.dayofweek_time["3"]["end_time_hour"] : "24",
				'dayofweek_time[3].end.minute': timeperiod.dayofweek_time["3"] ? timeperiod.dayofweek_time["3"]["end_time_minute"] : "00",
				'dayofweek_time[4].begin.hour': timeperiod.dayofweek_time["4"] ? timeperiod.dayofweek_time["4"]["begin_time_hour"] : "00",
				'dayofweek_time[4].begin.minute': timeperiod.dayofweek_time["4"] ? timeperiod.dayofweek_time["4"]["begin_time_minute"] : "00",
				'dayofweek_time[4].end.hour': timeperiod.dayofweek_time["4"] ? timeperiod.dayofweek_time["4"]["end_time_hour"] : "24",
				'dayofweek_time[4].end.minute': timeperiod.dayofweek_time["4"] ? timeperiod.dayofweek_time["4"]["end_time_minute"] : "00",
				'dayofweek_time[5].begin.hour': timeperiod.dayofweek_time["5"] ? timeperiod.dayofweek_time["5"]["begin_time_hour"] : "00",
				'dayofweek_time[5].begin.minute': timeperiod.dayofweek_time["5"] ? timeperiod.dayofweek_time["5"]["begin_time_minute"] : "00",
				'dayofweek_time[5].end.hour': timeperiod.dayofweek_time["5"] ? timeperiod.dayofweek_time["5"]["end_time_hour"] : "24",
				'dayofweek_time[5].end.minute': timeperiod.dayofweek_time["5"] ? timeperiod.dayofweek_time["5"]["end_time_minute"] : "00",
				'dayofweek_time[6].begin.hour': timeperiod.dayofweek_time["6"] ? timeperiod.dayofweek_time["6"]["begin_time_hour"] : "00",
				'dayofweek_time[6].begin.minute': timeperiod.dayofweek_time["6"] ? timeperiod.dayofweek_time["6"]["begin_time_minute"] : "00",
				'dayofweek_time[6].end.hour': timeperiod.dayofweek_time["6"] ? timeperiod.dayofweek_time["6"]["end_time_hour"] : "24",
				'dayofweek_time[6].end.minute': timeperiod.dayofweek_time["6"] ? timeperiod.dayofweek_time["6"]["end_time_minute"] : "00",
				added_time: moment(timeperiod.added_time).format(dateFormat),
				modified_time: moment(timeperiod.modified_time).format(dateFormat)
			});
		} else {
			form.setFieldsValue({
				name: '',
				alias: '',
				'dayofweek[0]': true,
				'dayofweek[1]': true,
				'dayofweek[2]': true,
				'dayofweek[3]': true,
				'dayofweek[4]': true,
				'dayofweek[5]': true,
				'dayofweek[6]': true,
				'dayofweek_time[0].begin.hour': "00",
				'dayofweek_time[0].begin.minute':"00",
				'dayofweek_time[0].end.hour': "24",
				'dayofweek_time[0].end.minute': "00",
				'dayofweek_time[1].begin.hour': "00",
				'dayofweek_time[1].begin.minute': "00",
				'dayofweek_time[1].end.hour': "24",
				'dayofweek_time[1].end.minute': "00",
				'dayofweek_time[2].begin.hour': "00",
				'dayofweek_time[2].begin.minute': "00",
				'dayofweek_time[2].end.hour': "24",
				'dayofweek_time[2].end.minute': "00",
				'dayofweek_time[3].begin.hour': "00",
				'dayofweek_time[3].begin.minute': "00",
				'dayofweek_time[3].end.hour': "24",
				'dayofweek_time[3].end.minute': "00",
				'dayofweek_time[4].begin.hour': "00",
				'dayofweek_time[4].begin.minute': "00",
				'dayofweek_time[4].end.hour': "24",
				'dayofweek_time[4].end.minute': "00",
				'dayofweek_time[5].begin.hour': "00",
				'dayofweek_time[5].begin.minute': "00",
				'dayofweek_time[5].end.hour': "24",
				'dayofweek_time[5].end.minute': "00",
				'dayofweek_time[6].begin.hour': "00",
				'dayofweek_time[6].begin.minute': "00",
				'dayofweek_time[6].end.hour': "24",
				'dayofweek_time[6].end.minute': "00",
			});
		}
	};

	useEffect(() => {
		getTimeperiods();
	}, []);

	useEffect(() => {
		if(timeperiodIdEditing >= 0) {
			showEditModal();
		}
	}, [timeperiodIdEditing]);

	const handleCancel = () => {
		setTimeperiodIdEditing(-1);
		setShowingEditModal(false);
	};

	const handleCopy = (timeperiodId) => {
		const timeperiod = store.timeperiods.find(obj => obj.id == timeperiodId);
		setNewTimeperiod({ 
			...timeperiod, 
			name: `Copy of ${timeperiod.name}`, 
			id: -1 
		});
		setTimeperiodIdInlineEditing(-1);
		setCopyId(timeperiod.id);
	};

	const handleSave = (form, key) => {
    form.validateFields((error, row) => {
			if (error && 'name' in error) {
        return;
			}
			const timeperiod = store.timeperiods.find(obj => obj.id == copyId);
			let data = {
				...timeperiod,
				name: row.name,
				dayofweek: Array.from(new Array(7), (_, id) => false)
			}
			for (let i=0; i < 7; i++) {
				data = {
					...data,
					dayofweek: data.dayofweek.map((x, idx) => idx == i ? (timeperiod.dayofweek_time[i] ? true : false) : x)
				}
			}
			let dayofweek_time = [];
			for (let i=0; i < 7; i++) {
				dayofweek_time[i] = {
					begin: {
						hour: timeperiod.dayofweek_time[i] ? timeperiod.dayofweek_time[i]["begin_time_hour"] : "00",
						minute: timeperiod.dayofweek_time[i] ? timeperiod.dayofweek_time[i]["begin_time_minute"] : "00",
					},
					end: {
						hour: timeperiod.dayofweek_time[i] ? timeperiod.dayofweek_time[i]["end_time_hour"] : "24",
						minute: timeperiod.dayofweek_time[i] ? timeperiod.dayofweek_time[i]["end_time_minute"] : "00",
					}
				}
			}
			data = {
				...data,
				dayofweek_time: [...dayofweek_time]
			}

			setLoadingGlobal(true);
			timeperiodActions.addTimeperiod(data).then((response) => {
				setLoadingGlobal(false);
				if (response.data.error && response.data.error === true) {
					notification['error']({
						message: 'Error',
						description: response.data.msg ? response.data.msg : 'Failed to add timeperiod data!',
					});
				} else {
					notification['success']({
						message: 'Success',
						description:
							'Succeed to add timeperiod data.',
					});
					setNewTimeperiod(null)
					setTimeperiodIdInlineEditing('');
					setCopyId(null);
					getTimeperiods();
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
		setNewTimeperiod(null)
		setTimeperiodIdInlineEditing('');
		setCopyId(null);
  };

	const onPageChange = (page, pageSize) => {
		setCurrentPage(page);
	}

	const isEditing = record => record.id === timeperiodIdInlineEditing;

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
			title: 'Name',
			dataIndex: 'name',
			editable: true,
			className: 'textCenter',
			key: 'name',
			rules: [
				{ required: true, message: 'Please input Timeperiod Name!' },
				{ max: 240, message: 'Timeperiod Name must be less than max length of 240!' }
			],
			...getColumnSearchProps('name'),
			sorter: stringSorter('name')
		},
		{
			title: 'Alias',
			dataIndex: 'alias',
			editable: true,
			className: 'textCenter',
			key: 'alias',
			rules: [
				{ max: 240, message: 'Alias must be less than max length of 240!' }
			],
			...getColumnSearchProps('alias'),
			sorter: stringSorter('alias')
		},
		{ title: 'Sunday', dataIndex: 'dayofweek_time', className: 'textCenter', width: 120, key: 'dayofweek_time_0', render: (text, record) => (
			record.dayofweek_time["0"] ? `${record.dayofweek_time["0"].begin_time_hour}:${record.dayofweek_time["0"].begin_time_minute}~${record.dayofweek_time["0"].end_time_hour}:${record.dayofweek_time["0"].end_time_minute}` : ''
		) },
		{ title: 'Monday', dataIndex: 'dayofweek_time', className: 'textCenter', width: 120, key: 'dayofweek_time_1', render: (text, record) => (
			record.dayofweek_time["1"] ? `${record.dayofweek_time["1"].begin_time_hour}:${record.dayofweek_time["1"].begin_time_minute}~${record.dayofweek_time["1"].end_time_hour}:${record.dayofweek_time["1"].end_time_minute}` : ''
		) },
		{ title: 'Tuesday', dataIndex: 'dayofweek_time', className: 'textCenter', width: 120, key: 'dayofweek_time_2', render: (text, record) => (
			record.dayofweek_time["2"] ? `${record.dayofweek_time["2"].begin_time_hour}:${record.dayofweek_time["2"].begin_time_minute}~${record.dayofweek_time["2"].end_time_hour}:${record.dayofweek_time["2"].end_time_minute}` : ''
		) },
		{ title: 'Wednesday', dataIndex: 'dayofweek_time', className: 'textCenter', width: 120, key: 'dayofweek_time_3', render: (text, record) => (
			record.dayofweek_time["3"] ? `${record.dayofweek_time["3"].begin_time_hour}:${record.dayofweek_time["3"].begin_time_minute}~${record.dayofweek_time["3"].end_time_hour}:${record.dayofweek_time["3"].end_time_minute}` : ''
		) },
		{ title: 'Tursday', dataIndex: 'dayofweek_time', className: 'textCenter', width: 120, key: 'dayofweek_time_4', render: (text, record) => (
			record.dayofweek_time["4"] ? `${record.dayofweek_time["4"].begin_time_hour}:${record.dayofweek_time["4"].begin_time_minute}~${record.dayofweek_time["4"].end_time_hour}:${record.dayofweek_time["4"].end_time_minute}` : ''
		) },
		{ title: 'Friday', dataIndex: 'dayofweek_time', className: 'textCenter', width: 120, key: 'dayofweek_time_5', render: (text, record) => (
			record.dayofweek_time["5"] ? `${record.dayofweek_time["5"].begin_time_hour}:${record.dayofweek_time["5"].begin_time_minute}~${record.dayofweek_time["5"].end_time_hour}:${record.dayofweek_time["5"].end_time_minute}` : ''
		) },
		{ title: 'Saturday', dataIndex: 'dayofweek_time', className: 'textCenter', width: 120, key: 'dayofweek_time_6', render: (text, record) => (
			record.dayofweek_time["6"] ? `${record.dayofweek_time["6"].begin_time_hour}:${record.dayofweek_time["6"].begin_time_minute}~${record.dayofweek_time["6"].end_time_hour}:${record.dayofweek_time["6"].end_time_minute}` : ''
		) },
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
						<Button type="primary" style={{ ...buttonStyle, marginRight: 10 }} disabled={timeperiodIdInlineEditing !== ''} onClick={() => handleEdit(record.id)} >
							<Icon type="edit" style={navIconStyle} />Edit</Button>
						{/* <Button type="secondary" style={{ ...buttonStyle, marginRight: 10 }} disabled={timeperiodIdInlineEditing !== ''} onClick={() => handleCopy(record.id)} >
							<Icon type="copy" style={navIconStyle} />Copy</Button> */}
						<Button style={{ ...buttonStyle }} disabled={timeperiodIdInlineEditing !== ''} onClick={() => handleDelete(record.id)} >
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
	const timeSelectStyle = { width: 75, paddingLeft: 5, paddingRight: 5 }
	const hours = Array.from(new Array(25), (_, id) => id.toString().length < 2 ? "0" + id.toString() : id.toString())
	const minutes = Array.from(new Array(60), (_, id) => id.toString().length < 2 ? "0" + id.toString() : id.toString())

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
						<Button type="primary" style={{ ...buttonStyle, float: "right", marginBottom: 10 }} onClick={handleAdd}>
							<Icon type="plus" style={navIconStyle} />Add New Timeperiod
					</Button>
						<EditableContext.Provider value={form}>
							<Table
								components={components}
								columns={columns}
								dataSource={newTimeperiod ? [...store.timeperiods.slice(0, pageSize * (currentPage - 1)), newTimeperiod, ...store.timeperiods.slice(pageSize * (currentPage - 1))] : store.timeperiods}
								bordered
								size='small'
								pagination={{ position: 'both', onChange: onPageChange }}
								loading={loadingTimeperiods}
								rowKey="id"
							/>
						</EditableContext.Provider>
						
						<Modal
							width={1100}
							visible={showingEditModal}
							title={timeperiodIdEditing && timeperiodIdEditing > 0 ? "Edit Timeperiod" : "Add New Timeperiod"}
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
								<Form.Item label="Name">
									{getFieldDecorator('name', {
										rules: columns.find(c => c.dataIndex === 'name').rules,
									})(<Input disabled={timeperiodIdEditing && timeperiodIdEditing > 0} />)}
								</Form.Item>
								<Form.Item label="Alias">
									{getFieldDecorator('alias', {
										rules: columns.find(c => c.dataIndex === 'alias').rules,
									})(<Input />)}
								</Form.Item>
								<Form.Item>
									<Row>
										<Col span={12}>
											{getFieldDecorator('dayofweek[0]', {
												valuePropName: 'checked',
												initialValue: true,
											})(<Checkbox >Sunday</Checkbox>)}
											{getFieldDecorator('dayofweek_time[0].begin.hour', {
												initialValue: "00",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{hours.map((d, i) => <Option key={i}>{d}</Option>)}
												</Select>
											)}
											:
											{getFieldDecorator('dayofweek_time[0].begin.minute', {
												initialValue: "00",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{minutes.map((d, i) => <Option value={d} key={i}>{d}</Option>)}
												</Select>
											)}
											~
											{getFieldDecorator('dayofweek_time[0].end.hour', {
												initialValue: "24",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{hours.map((d, i) => <Option value={d} key={i}>{d}</Option>)}
												</Select>
											)}
											:
											{getFieldDecorator('dayofweek_time[0].end.minute', {
												initialValue: "00",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{minutes.map((d, i) => <Option value={d} key={i}>{d}</Option>)}
												</Select>
											)}
										</Col>
										<Col span={12}>
											{getFieldDecorator('dayofweek[1]', {
												valuePropName: 'checked',
												initialValue: true,
											})(<Checkbox >Monday</Checkbox>)}
											{getFieldDecorator('dayofweek_time[1].begin.hour', {
												initialValue: "00",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{hours.map((d, i) => <Option value={d} key={i}>{d}</Option>)}
												</Select>
											)}
											:
											{getFieldDecorator('dayofweek_time[1].begin.minute', {
												initialValue: "00",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{minutes.map((d, i) => <Option value={d} key={i}>{d}</Option>)}
												</Select>
											)}
											~
											{getFieldDecorator('dayofweek_time[1].end.hour', {
												initialValue: "24",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{hours.map((d, i) => <Option value={d} key={i}>{d}</Option>)}
												</Select>
											)}
											:
											{getFieldDecorator('dayofweek_time[1].end.minute', {
												initialValue: "00",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{minutes.map((d, i) => <Option value={d} key={i}>{d}</Option>)}
												</Select>
											)}
										</Col>
									</Row>
								</Form.Item>
								<Form.Item>
									<Row>
										<Col span={12}>
											{getFieldDecorator('dayofweek[2]', {
												valuePropName: 'checked',
												initialValue: true,
											})(<Checkbox >Tuesday</Checkbox>)}
											{getFieldDecorator('dayofweek_time[2].begin.hour', {
												initialValue: "00",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{hours.map((d, i) => <Option value={d} key={i}>{d}</Option>)}
												</Select>
											)}
											:
											{getFieldDecorator('dayofweek_time[2].begin.minute', {
												initialValue: "00",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{minutes.map((d, i) => <Option value={d} key={i}>{d}</Option>)}
												</Select>
											)}
											~
											{getFieldDecorator('dayofweek_time[2].end.hour', {
												initialValue: "24",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{hours.map((d, i) => <Option value={d} key={i}>{d}</Option>)}
												</Select>
											)}
											:
											{getFieldDecorator('dayofweek_time[2].end.minute', {
												initialValue: "00",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{minutes.map((d,i) => <Option value={d} key={i}>{d}</Option>)}
												</Select>
											)}
										</Col>
										<Col span={12}>
											{getFieldDecorator('dayofweek[3]', {
												valuePropName: 'checked',
												initialValue: true,
											})(<Checkbox >Wednesday</Checkbox>)}
											{getFieldDecorator('dayofweek_time[3].begin.hour', {
												initialValue: "00",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{hours.map((d, i) => <Option value={d} key={i}>{d}</Option>)}
												</Select>
											)}
											:
											{getFieldDecorator('dayofweek_time[3].begin.minute', {
												initialValue: "00",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{minutes.map((d, i) => <Option value={d} key={i}>{d}</Option>)}
												</Select>
											)}
											~
											{getFieldDecorator('dayofweek_time[3].end.hour', {
												initialValue: "24",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{hours.map((d, i) => <Option value={d} key={i}>{d}</Option>)}
												</Select>
											)}
											:
											{getFieldDecorator('dayofweek_time[3].end.minute', {
												initialValue: "00",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{minutes.map((d, i) => <Option value={d} key={i}>{d}</Option>)}
												</Select>
											)}
										</Col>
									</Row>
								</Form.Item>
								<Form.Item>
									<Row>
										<Col span={12}>
											{getFieldDecorator('dayofweek[4]', {
												valuePropName: 'checked',
												initialValue: true,
											})(<Checkbox >Thursday</Checkbox>)}
											{getFieldDecorator('dayofweek_time[4].begin.hour', {
												initialValue: "00",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{hours.map((d, i) => <Option value={d} key={i}>{d}</Option>)}
												</Select>
											)}
											:
											{getFieldDecorator('dayofweek_time[4].begin.minute', {
												initialValue: "00",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{minutes.map((d, i) => <Option value={d} key={i}>{d}</Option>)}
												</Select>
											)}
											~
											{getFieldDecorator('dayofweek_time[4].end.hour', {
												initialValue: "24",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{hours.map((d, i) => <Option value={d} key={i}>{d}</Option>)}
												</Select>
											)}
											:
											{getFieldDecorator('dayofweek_time[4].end.minute', {
												initialValue: "00",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{minutes.map((d, i) => <Option value={d} key={i}>{d}</Option>)}
												</Select>
											)}
										</Col>
										<Col span={12}>
											{getFieldDecorator('dayofweek[5]', {
												valuePropName: 'checked',
												initialValue: true,
											})(<Checkbox >Friday</Checkbox>)}
											{getFieldDecorator('dayofweek_time[5].begin.hour', {
												initialValue: "00",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{hours.map((d, i) => <Option value={d} key={i}>{d}</Option>)}
												</Select>
											)}
											:
											{getFieldDecorator('dayofweek_time[5].begin.minute', {
												initialValue: "00",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{minutes.map((d, i) => <Option value={d} key={i}>{d}</Option>)}
												</Select>
											)}
											~
											{getFieldDecorator('dayofweek_time[5].end.hour', {
												initialValue: "24",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{hours.map((d, i) => <Option value={d} key={i}>{d}</Option>)}
												</Select>
											)}
											:
											{getFieldDecorator('dayofweek_time[5].end.minute', {
												initialValue: "00",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{minutes.map((d, i) => <Option value={d} key={i}>{d}</Option>)}
												</Select>
											)}
										</Col>
									</Row>
								</Form.Item>
								<Form.Item>
									<Row>
										<Col span={12}>
											{getFieldDecorator('dayofweek[6]', {
												valuePropName: 'checked',
												initialValue: true,
											})(<Checkbox >Saturday</Checkbox>)}
											{getFieldDecorator('dayofweek_time[6].begin.hour', {
												initialValue: "00",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{hours.map((d, i) => <Option value={d} key={i}>{d}</Option>)}
												</Select>
											)}
											:
											{getFieldDecorator('dayofweek_time[6].begin.minute', {
												initialValue: "00",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{minutes.map((d, i) => <Option value={d} key={i}>{d}</Option>)}
												</Select>
											)}
											~
											{getFieldDecorator('dayofweek_time[6].end.hour', {
												initialValue: "24",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{hours.map((d, i) => <Option value={d} key={i}>{d}</Option>)}
												</Select>
											)}
											:
											{getFieldDecorator('dayofweek_time[6].end.minute', {
												initialValue: "00",
												rules: [],
											})(
												<Select style={timeSelectStyle}>
													{minutes.map((d, i) => <Option value={d} key={i}>{d}</Option>)}
												</Select>
											)}
										</Col>
									</Row>
								</Form.Item>
								{timeperiodIdEditing && timeperiodIdEditing > 0 ? (
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

export default Form.create({ name: 'TimeperiodsAdminForm' })(TimeperiodsAdminForm);