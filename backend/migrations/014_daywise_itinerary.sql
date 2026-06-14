-- Migration: 014_daywise_itinerary.sql
CREATE TABLE IF NOT EXISTS daywise_itinenary (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quote_id INT NOT NULL,
    company_id INT NOT NULL,
    itenary_name VARCHAR(100) NOT NULL,
    date DATETIME NOT NULL,
    day INT NOT NULL,
    day_name VARCHAR(15) NOT NULL,
    vehicle_type VARCHAR(25) NOT NULL,
    lead_id INT NOT NULL,
    amt FLOAT NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_quote (quote_id),
    INDEX idx_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
