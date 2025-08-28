import React, {useState} from "react";
import axios from 'axios';
import { API_ENDPOINTS } from "./ApiEndpoints";
import SearchModal from './SearchModal';

// Modal.setAppElement('#root');

// UserSection Component
const UserSection = ({onProductSelect}) => {
    const [userId, setUserId] = useState('');
    const [userInfo, setUserInfo] = useState(null);
    const [user, setUser] = useState(null);
    const [error, setError] = useState('');
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  
    const fetchUserInfo = async () => {
      try {
        const response = await axios.get(`${API_ENDPOINTS.USERS}/${userId}`);
        if (response.data.result) {
          setUserInfo(response.data.user);
          setError('');
        } else {
          setUserInfo(null);
          setError('User not found.');
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        setUserInfo(null);
        setError('Failed to fetch user information. Please verify the user Id and try again.');
      }
    };
  
    const resetForm = () => {
      setUserId('');
      setUser('');
      setUserInfo(null);
      setError('');
    };

    

  
    return (
        <section className="user-section">
          <h3>User Verification</h3>
          <div>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter User ID"
            />
            <button onClick={fetchUserInfo}>Get Details</button>
            <button onClick={() => setIsSearchModalOpen(true)}>Search Product</button>
          </div>
          <SearchModal
            isOpen={isSearchModalOpen}
            onClose={() => setIsSearchModalOpen(false)}
            onProductSelect={onProductSelect}
          />
          {error && <p className="error">{error}</p>}
          {userInfo && (
            <div className="user-info">
              <h4>User Information</h4>
              <p>ID: {userInfo.user_id}</p>
              <p>Name: {userInfo.name}</p>
              <p>Email: {userInfo.email}</p>
              <button onClick={resetForm}>Done</button>
              {/* Add more user fields as needed */}
            </div>
          )}
        </section>
      );
    };

  export default UserSection;