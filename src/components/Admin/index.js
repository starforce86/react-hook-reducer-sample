// @flow
import * as React from 'react';
import styled from 'styled-components';
import { Button, Row, Col, Table, Input } from 'reactstrap';
import { adminActions } from '../../modules/Admin';
import UserAddForm from "./forms/user_add";
import UserEditForm from "./forms/user_edit";
import UserResetPasswordForm from "./forms/user_reset_password";

const UserAdminFormStyled = styled.div`
  width: 100%;
  padding: 15px;
  margin: auto;

  .form-acct .form-control {
    position: relative;
    box-sizing: border-box;
    height: auto;
    padding: 10px;
    font-size: 16px;
  }
  .form-acct .form-control:focus {
    z-index: 2;
  }
  .form-acct input[type="password"] {
    margin-bottom: 10px;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }
`;

type Props = {};

type State = {
  users: Array
};

const INITIAL_STATE = {
  users: [],
  currentUser: null,
  newUser: false
};

class UserAdminForm extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.updateUsersState = this.updateUsersState.bind(this);
    this.state = { ...INITIAL_STATE };
  }

  componentDidMount() {
    this.updateUsersState();
  }

  updateUsersState() {
    adminActions.getUsers().then((response) => {
      if (response && response.data) {
        this.setState({ 'users': response.data });
      }
    })
      .catch(function () {
        this.setState({ 'users': [] });
      });
  }

  render() {
    const userNodes = this.state.users.map(user =>
      <tr key={user.id} onClick={() => this.setState({ currentUser: user.id, newUser: false })}>
        <td>{user.id}</td>
        <td>{user.email}</td>
        <td>{user.module_access_name}</td>
        <td><Input type="checkbox"  checked={user.is_admin} disabled={true} style={{ marginLeft: 0 }}/></td>
        <td>
          <Row>
            <Col md="6">
              <UserEditForm id={user.id} className="video_add_form" onChangeUpdateGrid={this.updateUsersState} />
            </Col>
            <Col md="6">
              <UserResetPasswordForm id={user.id} email={user.email}/>
            </Col>
          </Row>
        </td>
      </tr>);
    return (<UserAdminFormStyled className="form-acct">
      <Row>
        <Col md="11" />
        <Col md="1"><UserAddForm onChangeUpdateGrid={this.updateUsersState}/></Col>
      </Row>
      <Row>
        <Col md="3" />
        <Col md="6">
          <Table hover  className="text-center">
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Group</th>
                <th>Admin</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {userNodes}
            </tbody>
          </Table>
        </Col>
      </Row>
    </UserAdminFormStyled>)
  }
}

export default UserAdminForm;
