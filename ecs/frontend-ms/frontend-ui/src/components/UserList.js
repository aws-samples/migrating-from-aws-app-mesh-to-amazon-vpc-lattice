import React from 'react';

// TableHeader.js
const TableHeader = () => (
    <thead>
      <tr>
        <th>ID</th>
        <th>Name</th>
        <th>Email</th>
      </tr>
    </thead>
  );
  
  // TableRow.js
  const TableRow = ({ user, onCopyId }) => (
    <tr key={user.user_id}>
      <td>
        {user.user_id}
        <button 
          onClick={() => onCopyId(user.user_id)}
          className="copy-button"
          aria-label={`Copy ID ${user.user_id}`}
        >
          Copy
        </button>
      </td>
      <td>{user.name}</td>
      <td>{user.email}</td>
    </tr>
  );
  
  // UserList.js
  const UserList = ({ users, onBack }) => {
    const handleCopyToClipboard = async (userId) => {
      try {
        await navigator.clipboard.writeText(userId);
        // Optional: Add toast notification or feedback
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    };
  
    if (!users?.length) {
      return <p>No users found</p>;
    }
  
    return (
    <div className="user-list-window">
    <button onClick={onBack} className="back-button">Back to Home</button>
    <h2>User Directory</h2>
      <div className="table-container">
        <table>
          <TableHeader />
          <tbody>
            {users.map((user) => (
              <TableRow 
                key={user.user_id}
                user={user}
                onCopyId={handleCopyToClipboard}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
    );
  };
  
export default UserList;
  






/*


// UserList Component
const UserList = ({ users, onBack }) => {
    console.log('UserList rendering with users:', users);

    const copyToClipboard = (value) => {
        console.log(value);
        navigator.clipboard.writeText(value).then(function () {
            console.log('Copying to clipboard was successful!');
        }, function (err) {
            console.error('Async: Could not copy text: ', err);
        });
    }

    return (
    <div className="user-list-window">
      <button onClick={onBack} className="back-button">Back to Home</button>
      <h2>User Directory</h2>
      {users.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.user_id}>
                <td>{user.user_id}&nbsp;<button onClick={e => copyToClipboard(user.user_id)}>Copy</button></td>
                <td>{user.name}</td>
                <td>{user.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No users available.</p>
      )}
    </div>
  );
      };

export default UserList;
*/