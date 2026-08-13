## Employee Account Data Reset & Real User Accounts

Please update the employee/user management system with the following requirements:

### 1. Remove Existing Accounts

* Remove **all existing admin and user accounts** from the system.
* Do not keep any old/demo/test users.
* After removal, create only the accounts listed below.

### 2. Create New Accounts

Create a new account for every person in the following list.

| Name                         | Designation                                 | Role            |
| ---------------------------- | -------------------------------------------- | --------------- |
| Syed Shujaat Ali             | Group Chairman                              | Admin, CEO      |
| Shamshad Ali                 | Senior Vice Chairman                        | User            |
| Vania Ali                    | Sales & Marketing                           | User            |
| Shiraan Ali                  | Sales & Marketing                           | User            |
| Asad Ali                     | Group Director                              | Admin, Director |
| Muhammad Adeel               | Manager Supply Chain                        | User            |
| Let. Col Kashif Bashir (Ret) | Director IFC ISB                            | User            |
| Brig Nayyar Abbas Zaidi      | Sale Support                                | User            |
| AVM Hussain                  | Sale Support                                | User            |
| Ibad Jabbar                  | Business Development                        | User            |
| Usman                        | Business Development                        | User            |
| Atif Tasneem                 | Manager OEP KSA                             | User            |
| Zaheer Ahmed                 | Group Manager                               | User            |
| Muhammad Meer                | Assistant KSA (Seafood Division)            | User            |
| Kanwal                       | Aviation Assistant KHI                      | User            |
| Ziaullah                     | Microbiologist                              | User            |
| Tahir Hussain                | Manager                                     | User            |
| Mohammad Tariq Zubair Khan   | Cargo Manager/Sales and Operation           | User            |
| Adnan Shahid                 | Assistant Manager Cargo Sales and Operation | User            |
| Ahsan Ali                    | Cargo Operation South                       | User            |
| Syed Azfal Ali Zahidi        | CFO                                         | User            |
| Kashif Ali                   | Travel Manager                              | User            |
| Muharram Ali                 | Manager Operation                           | User            |
| Gohar Mehdi                  | IT Manager/Asst. Manager Finance            | User            |
| INSHAAL ALI KHAN             | Assistant Operation Manager IFC             | User            |
| Jahanzaib Saleem              | Assistant Operation Manager IFC             | User            |
| Shaharyar Ali                | Assistant Operation Manager IFC             | User            |
| Shazhad Rahim Ali             | Admin Manager/HR IFC                        | User            |
| Asad Naviad                   | AI-Automation Engineer                      | User            |
| M. Danish Meraj               | AI-Automation Engineer - Intern             | User            |
| Shazaib Ahmed                 | Business Process Analyst                    | User            |
| Ajiya Anwar                   | AI-Automation Engineer                      | User            |
| MarJan Farooqui                | Legal Officer/HR Manager                    | User            |
| Muhammad Qasim                | Assistant Manager                           | User            |
| Shehbaz Ahmed                 | Director/Country Manager                    | User            |
| Razia Ashraf                  | Assistant Manager LHE                       | User            |
| Ghulm Sadiq                   | Manager LHE                                 | User            |
| Ishtiaq Ahmed                 | Office Accounts Assistant                   | User            |
| Mumtaz Hussain                 | —                                           | User            |
| Muhammad Amjad SKT             | Asst Manager Operation                      | User            |
| Muhammad Qasim SKT             | Cargo Operation North                       | User            |
| Danish                         | Delivery Boy                                | User            |
| Hasnain                        | Office Assistant                            | User            |
| Shoaib                         | Office Boy                                  | User            |
| Saif ur Rehman                  | Office Boy                                  | User            |
| Raza Saleem                    | Delivery Boy                                | User            |
| Ramm Chand                     | Sweeper                                     | User            |
| Guard 1                        | Office                                      | User            |
| Guard 2                        | Office                                      | User            |
| Hanif Mashi                    | Airport IFC                                 | User            |
| Shoukat Mashi                  | Airport IFC                                 | User            |
| Nabeel                         | Airport IFC                                 | User            |
| Wasim Salamat                  | Airport IFC                                 | User            |
| Syed Zaki Hussain              | Airport M&S                                 | User            |
| Amin Yar Khan                  | Airport M&S                                 | User            |
| Merajuddin                     | Airport M&S                                 | User            |
| Shabbir                        | Masum Airport                               | User            |
| Imam Airport Masjid            | Airport-IFC                                 | User            |
| Usman                          | Fisheries                                   | User            |
| Sarfaraz                       | Fisheries                                   | User            |
| Abdul                          | Fisheries                                   | User            |
| Zeeshan                        | Fisheries                                   | User            |
| Umair                          | Fisheries                                   | User            |
| Abdullah                       | Fisheries                                   | User            |
| Mumtaz                         | Fisheries                                   | User            |
| Guard 3                        | House                                       | User            |
| Guard 4                        | House                                       | User            |

### 3. Important Role Rules

* **Syed Shujaat Ali** → Admin + CEO
* **Asad Ali** → Admin + Director
* All other accounts → User
* Admin accounts should have access to the admin dashboard and admin features.
* Normal users should only have access to their own employee/task-related screens according to the existing permission system.
* Do not give admin permissions to normal users.

### 4. Duplicate Names

There are two separate employees named **Usman**:

* Usman — Business Development
* Usman — Fisheries

Create them as **two separate accounts**. Use a unique username/email internally so they do not conflict.

There are also two different **Mumtaz** entries:

* Mumtaz Hussain — no designation provided
* Mumtaz — Fisheries

Create them as separate accounts.

### 5. Account Creation

For every employee:

* Create a unique user account.
* Save the employee's **Name**.
* Save the employee's **Designation**.
* Save the appropriate **Role**.
* Ensure login credentials are generated securely.
* Ensure duplicate names do not cause account conflicts.
* Do not create any additional demo/test accounts.

### 6. Final Verification

After creating the accounts:

* Verify the total number of accounts.
* Verify that only **2 accounts have Admin privileges**.
* Verify that all remaining accounts have **User** privileges.
* Verify both Usman accounts separately.
* Verify both Mumtaz accounts separately.
* Verify every employee's designation is saved correctly.
* Verify users can log in successfully.
* Verify normal users cannot access admin-only screens.
* Verify admins can access the admin dashboard and all existing admin functionality.
