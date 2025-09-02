import React, { useState, useCallback } from 'react';
import axios from 'axios';
import './App.css';
// import polyglotLattice from './polyglot-lattice.png'; // Import the image
import NavBar from './components/NavBar';
import HeroSection from './components/HeroSection';
import UserSection from './components/UserSection';
import OrderSection from './components/OrderSection';
import UserList from './components/UserList';
import ProductList from './components/ProductList';
import { ArchitectureView } from './components/ArchitectureView';
import { API_ENDPOINTS } from './components/ApiEndpoints';
import * as https from 'https';

// Main App
function App() {
  const [view, setView] = useState('home');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [selectedProductId, setSelectedProductId] = useState('');

  // console.log("============================");
  // console.log(process.env);
  // console.log(API_ENDPOINTS.USERS);
  // console.log("============================");
  
  const handleArchitectureClick = useCallback((e) => {
    e.preventDefault();
    setView('architecture');
  }, []);

  // const fetchData = useCallback(async (endpoint, viewName) => {
  //   try {
  //     console.log(`Fetching ${viewName} from endpoint:`, endpoint);
  //     const response = await axios.get(endpoint);
  //     console.log(`Raw response:`, response);
  //     console.log(`Response data:`, response.data);
      
  //     if (viewName === 'users') {
  //       if (response.data && response.data.users) {
  //         console.log('Users found:', response.data.users);
  //         setData(response.data.users);
  //       } else {
  //         console.warn('No users array in response:', response.data);
  //       }
  //     } else {
  //       setData(response.data);
  //     }
  //     setView(viewName);
  //   } catch (error) {
  //     console.error(`Error fetching ${viewName}:`, error);
  //     if (error.response) {
  //       console.error('Error response:', error.response.data);
  //     }
  //   }
  // }, []);
  const fetchData = useCallback(async (endpoint, viewName) => {
    console.log(`Fetching from: ${endpoint}`);
    setLoading(true);
    setError(null);
    try {
      const axiosConfig = {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 5000,
        validStatus: function (status) {
          return status >= 200 && status < 300; // default
        }
        //maxRedirects: 0,
        //baseURL: '/api'
      };
      if (process.env.NODE_ENV === 'development') {
        axiosConfig.httpsAgent = new https.Agent({
          rejectUnauthorized: false
        });
      }
      
  
    
  
      const response = await axios.get(endpoint, axiosConfig);
      console.log(`Raw API response:`, response);
      // if (viewName === 'users') {
      //   const userData = response.data.users || [];
      //   console.log('Processed user data:', userData);
      //   setData(response.userData);
      // } else {
      //   setData(response.data);
      // }
      if (response.headers['content-type'].includes('application/json')) {
        if (viewName === 'users') {
          const userData = response.data.users || [];
          console.log('User data:', userData);
          setData(userData);
        } else if (viewName === 'products') {
          const productData = response.data.products || [];
          console.log('User data:', productData);
          setData(productData);
        } else {
          setData(response.data);
        }
      } else {
        throw new Error('Invalid response type. Expected JSON.');
      }
      setView(viewName);
    } catch (error) {
      setError(error.message);
      console.error(`Error fetching ${viewName}:`, error);
    } finally {
      setLoading(false);
    }
  }, []);
  

  const onProductSelect = (selectedProductId) => {
    setSelectedProductId(selectedProductId);
  }

  const handleProductClick = useCallback((e) => {
    e.preventDefault();
    fetchData(API_ENDPOINTS.PRODUCTS, 'products');
  }, [fetchData]);

  const handleDirectoryClick = useCallback((e) => {
    e.preventDefault();
    console.log('Directory click handler triggered')
    fetchData(API_ENDPOINTS.USERS, 'users');
  }, [fetchData]);

  const handleBackToHome = useCallback(() => {
    setView('home');
    setData([]);
  }, []);


  const renderView = () => {
    console.log('Current view:', view);
    console.log('Current data:', data);
    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    switch (view) {
      case 'products':
        return <ProductList products={data} onBack={handleBackToHome} />;
      case 'users':
        return <UserList users={data} onBack={handleBackToHome} />;
      case 'architecture':
        return <ArchitectureView onBack={handleBackToHome} />;
      default:
        return (
          <>
            <NavBar 
              onProductClick={handleProductClick} 
              onDirectoryClick={handleDirectoryClick}
              onArchitectureClick={handleArchitectureClick}
            />
            <HeroSection />
            <UserSection onProductSelect={onProductSelect} />
            <OrderSection selectedProductId={selectedProductId} />
          </>
        );
    }
  };

  return (
    <div className="App">
      {renderView()}
    </div>
  );
}

export default App;
