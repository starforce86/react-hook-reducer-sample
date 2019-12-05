// @flow
import * as React from 'react';
import { useState } from 'react';
import { Container, Row, Col } from 'reactstrap';
import { Table, Modal, Button, Form, Input, Tooltip, Icon, notification, Switch, Checkbox, Select, Spin } from 'antd';
import { syncSettingsActions } from '../../modules/SyncSettings';

const buttonStyle = {}
const navIconStyle = { verticalAlign: 2 }

const SyncSettingsAdminForm = props => {

    const [loadingGlobal, setLoadingGlobal] = useState(false);

    const handleSynSettings = () => {
        setLoadingGlobal(true);
        syncSettingsActions.syncSettings().then((response) => {
            setLoadingGlobal(false);
            if (response.data.error && response.data.error === true) {
                notification['error']({
                    message: 'Error!',
                    description: response.data.msg ? response.data.msg : `Failed to sync all settings!`,
                });
            } else {
                notification['success']({
                    message: 'Success',
                    description: `Succeed to sync all settings!`,
                });
            }
        })
        .catch(function (error) {
            setLoadingGlobal(false);
            notification['error']({
                message: 'Error!',
                description: error.message,
            });
        });
    };

    return (
	  <Container fluid className="content">
        <Spin spinning={loadingGlobal}>
            <Button type="primary" style={{ ...buttonStyle, marginBottom: 10, marginTop: 50 }} onClick={handleSynSettings} >
            Sync All Settings
            </Button>
        </Spin>
	  </Container>
	)

}

export default Form.create({ name: 'SyncSettingsAdminForm' })(SyncSettingsAdminForm);