

CREATE TABLE users (
    user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(250) NOT NULL,
    email VARCHAR(250) NOT NULL UNIQUE
);

-- Insert sample data
INSERT INTO users (name, email) VALUES
    ('John Doe', 'john@example.com'),
    ('Jane Smith', 'jane@example.com'),
    ('Bob Johnson', 'bob@example.com'),
    ('Alice Williams', 'alice@example.com'),
    ('Tom Davis', 'tom@example.com'),
    ('Emily Wilson', 'emily@example.com'),
    ('Michael Brown', 'michael@example.com'),
    ('Sophia Taylor', 'sophia@example.com'),
    ('David Anderson', 'david@example.com'),
    ('Emma Thomas', 'emma@example.com');


CREATE TABLE products (
    product_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sku VARCHAR(50) UNIQUE DEFAULT gen_random_uuid(),
    description TEXT,
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    CONSTRAINT unique_product_name UNIQUE (product_name),
    CONSTRAINT product_price_non_zero CHECK (price >= 0.01)
);


INSERT INTO products (product_name, price) VALUES
    ('Laptop', 1500.00),
    ('Mobile', 800.00),
    ('Tablet', 1200.00),
    ('Headphones', 100.00),
    ('Camera', 1200.00);



-- orders

CREATE TABLE orders (
    order_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE order_items (
    order_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Indexes for better query performance
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- Sample data insertion
INSERT INTO orders (user_id, status) VALUES
    ((SELECT user_id FROM users where name = 'John Doe'), 'delivered'),
    ((SELECT user_id FROM users where name = 'Alice Williams'), 'processing');

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
    ((SELECT order_id FROM orders where user_id = (SELECT user_id FROM users where name = 'John Doe')), (SELECT product_id FROM products where product_name = 'Laptop'), 2, 1500.00),  -- 2 laptops
    ((SELECT order_id FROM orders where user_id = (SELECT user_id FROM users where name = 'John Doe')), (SELECT product_id FROM products where product_name = 'Headphones'), 1, 100.00),   -- 1 headphone
    ((SELECT order_id FROM orders where user_id = (SELECT user_id FROM users where name = 'Alice Williams')), (SELECT product_id FROM products where product_name = 'Mobile'), 1, 800.00);   -- 1 mobile

-- Trigger to update total_amount in orders table
CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE orders
    SET total_amount = (
        SELECT SUM(subtotal)
        FROM order_items
        WHERE order_id = NEW.order_id
    )
    WHERE order_id = NEW.order_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_order_total_trigger
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW
EXECUTE FUNCTION update_order_total();



-- Queries Order Detail

SELECT 
    o.order_id,
    u.name as customer_name,
    o.order_date,
    o.status,
    p.product_name,
    oi.quantity,
    oi.unit_price,
    oi.subtotal
FROM orders o
JOIN users u ON o.user_id = u.user_id
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id
ORDER BY o.order_date DESC;


/*
               order_id               | customer_name  |         order_date         |   status   | product_name | quantity | unit_price | subtotal 
--------------------------------------+----------------+----------------------------+------------+--------------+----------+------------+----------
 a1f4daf3-d7d7-4819-b1a4-b9068eecae06 | John Doe       | 2024-12-10 23:52:46.596013 | delivered  | Laptop       |        2 |    1500.00 |  3000.00
 a1f4daf3-d7d7-4819-b1a4-b9068eecae06 | John Doe       | 2024-12-10 23:52:46.596013 | delivered  | Headphones   |        1 |     100.00 |   100.00
 2f3d743c-8b4c-4f6b-8c0d-805f1545de52 | Alice Williams | 2024-12-10 23:52:46.596013 | processing | Mobile       |        1 |     800.00 |   800.00
*/

