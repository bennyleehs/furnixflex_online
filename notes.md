**Roles**

1. Superadmin
2. Managing Director
3. Director
4. Chief Officer
5. Manager
6. Assistant Manager
7. Supervisor
8. Staff
9. Partner
10. Non-executive Director

___
**IGNORE [LATER WILL UPDATE]**
**Role_permissions**

Roles   |  Role_permissions
1. |  `["1", "1.1", "1.2", "1.3", "2", "2.1", "2.2", "2.2.1", "2.2.2", "2.2.3", "2.2.4", "2.2.4.1", "2.2.5", "2.3", "2.3.1", "2.3.2", "2.3.3", "2.4", "2.4.1", "2.4.2", "2.4.3", "2.4.4", "3", "3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.7.1", "3.7.2", "3.7.3", "3.7.4", "4", "4.1", "4.1.1", "4.1.1.1", "4.1.1.2", "4.1.2", "4.1.2.1", "4.1.2.2", "5", "5.1", "5.1.1", "5.1.1.1", "5.1.1.2", "5.1.2", "5.1.2.1", "5.1.2.2", "6", "7", "8", "8.1", "8.2", "8.3", "8.4"]`

___

**NOTE: EXAMPLE**
___
-- PostgreSQL/MySQL with native JSON support

`INSERT INTO role_permissions (role_id, permissions)
VALUES 
(1, '["2.1", "2.2", "2.2.1", "2.2.2", "2.2.3", "2.2.4", "2.2.4.1", "2.2.5", "2.3", "2.3.1", "2.3.2", "2.3.3", "2.4", "2.4.1", "2.4.2", "2.4.3", "2.4.4"]');`

--  also structure the permissions in more complex ways

`INSERT INTO role_permissions (role_id, permissions)
VALUES 
(2, '{
  "menu": {
    "dashboard": ["1.1", "1.2"],
    "admin": ["2.1", "2.2", "2.2.1"],
    "sales": ["3.1", "3.2"]
  },
  "actions": {
    "view": true,
    "edit": true, 
    "delete": false
  }
}');`


___
table branch
- branch jb
- branch kl

table department
- sales
- production

table role
- manager
- supervisor
- staff

page info list - will based on {branch.department.role} = n * n * n of each table

No. | Branch | Dept | Role
1 | JB | Sales | Manager
2 | JB | Sales | Supervisor
3 | JB | Sales | Staff
4 | JB | Production | Manager
5 | JB | Production | Supervisor
6 | JB | Production | Staff
7 | KL | Sales | Manager
8 | KL | Sales | Supervisor
9 | KL | Sales | Staff
10 | KL | Production | Manager
11 | KL | Production | Supervisor
12 | KL | Production | Staff

Access Path: 1,6,7 is Default (Public)

                    *Branch(JB)
       |           |*Roles
       |           |Manager          |Supervisor     |Staff
*Dept  |Sales      |AccessPath: 2,3,5|AccessPath: 2,3|AccessPath: 3
       |Production |AccessPath: 2,3,5|AccessPath: 2,5|AccessPath: 5

___
light mode:
primary: #FFBC57
red (warn): #E53935
blue (update/edit): #7ABAF2
green (final): #BDF271 / #45BF55

dark mode:
primarydark: #E89F30
reddark: #C62A2F
bluedark: #358CE3
greendark: #219754


--
case: access_control.json = "JB.TECHNOLOGY.Supervisor": ["1.0.0"]
after update, everything is same: access_control.json = "JB.TECHNOLOGY.Supervisor": ["1.0.0", "1.0.1"]
expected update case:

Administration and its sub-menu has access_action (all value 1), Sales and its sub-menu has action (all value 3), History and its sub-menu has access_action (5.1, 5.2, 5.3 has value 3) (5.4 has value 1) = "JB.TECHNOLOGY.Supervisor": ["1.0.1", "2.0.3", "5.1.3", "5.2.3", "5.3.3", "5.4.1"]

1st digit indicates parent menu
2nd digit indicates the second decimal of children menu (sub menu). if all the sub-menu has action, put 0 to indicates has access. if the 3rd digit is different, make it like the exanple of History & its sub-menu.
3rd digit indicates actions.