
import React, { useState, useEffect } from "react";
import axios from 'axios';
import { API_ENDPOINTS } from "./ApiEndpoints";

  // Function to generate random alphanumeric string
  const generateOrderId = (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };


// OrderSection Component
const OrderSection = ({selectedProductId = ''}) => {
    const [userId, setUserId] = useState('');
    const [productId, setProductId] = useState(selectedProductId);
    const [quantity, setQuantity] = useState(1);
    const [orderStatus, setOrderStatus] = useState(null);
    const [orderId, setOrderId] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (selectedProductId) {
            setProductId(selectedProductId);
        }
    }, [selectedProductId]);    


    const placeOrder = async () => {
        setError('');
        setOrderStatus(null);
        setOrderId(null);

        if (!userId || !productId || quantity < 1) {
            setError('Please fill in all fields with valid values.');
            return;
        }

        try {
            // First, verify if the user exists
            const userResponse = await axios.get(`${API_ENDPOINTS.USERS}/${userId}`);
            if (!userResponse.data) {
                setError('Invalid User ID. Please check and try again.');
                return;
            }

            // Then, verify if the product exists
            const productResponse = await axios.get(`${API_ENDPOINTS.PRODUCTS}/${productId}`);
            if (!productResponse.data) {
                setError('Invalid Product ID. Please check and try again.');
                return;
            }

            // If both user and product are valid, place the order
            const newOrderId = generateOrderId();
            const orderResponse = await axios.post(API_ENDPOINTS.ORDERS, {
                id: newOrderId,
                userId: userId,
                productId: productId,
                quantity: parseInt(quantity, 10)
            });

            setOrderId(newOrderId);
            setOrderStatus({ success: true, message: `Order placed successfully. Order ID: ${newOrderId}` });
        } catch (error) {
            console.error('Error placing order:', error);
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                setError(`Failed to place order: ${error.response.data.message || 'Please try again.'}`);
            } else if (error.request) {
                // The request was made but no response was received
                setError('Failed to place order: No response from server. Please try again.');
            } else {
                // Something happened in setting up the request that triggered an Error
                setError('Failed to place order: An unexpected error occurred. Please try again.');
            }
        }
    };

    const findOrder = async () => {
        setError('');
        setOrderStatus(null);
        setOrderId(null);

        if (!userId) {
            setError('Please enter a User ID.');
            return;
        }

        try {
            const response = await axios.get(`${API_ENDPOINTS.ORDERS}/${userId}`);
            if (response.data && response.data.length > 0) {
                setOrderId(response.data[0].id);
                setOrderStatus({ success: true, message: `Order found for User ID: ${userId}` });
            } else {
                setError('No order found for the given User ID.');
            }
        } catch (error) {
            console.error('Error finding order:', error);
            setError('Failed to find order. Please try again.');
        }
    };

    const resetForm = () => {
        setUserId('');
        setProductId('');
        setQuantity(1);
        setOrderStatus(null);
        setOrderId(null);
        setError('');
    };

    return (
        <>
        <section className="order-section">
            <h3>Place an Order</h3>
            <div>
                <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="User ID"
                />
                <input
                    type="text"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    placeholder="Product ID"
                />
                <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="1"
                    placeholder="Quantity"
                />
                <button onClick={placeOrder}>Place Order</button>
            </div>
            {error && <p className="error">{error}</p>}
            {orderId && (
                <div className="order-info">
                    <h4>Order Information</h4>
                    <p>Order ID: {orderId}</p>
                    <p>Status: Order placed successfully</p>
                    <button onClick={resetForm}>Done</button>
                </div>
            )}
        </section>
        <section className="order-section">
            <h3>Orders</h3>
            <div>
                <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="User ID"
                />
                <button onClick={findOrder}>Find Order</button>
            </div>
            {error && <p className="error">{error}</p>}
            {orderId && (
                <div className="order-info">
                    <h4>Order Information</h4>
                    <p>Order ID: {orderId}</p>
                    <p>Status: Order placed successfully</p>
                    <button onClick={resetForm}>Done</button>
                </div>
            )}
        </section>

        </>
    );
};


export default OrderSection;