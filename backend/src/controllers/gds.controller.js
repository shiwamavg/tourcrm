async function searchFlights(req, res) {
    const { from = 'DEL', to = 'BOM', date, cabinClass = 'Economy' } = req.query;
    
    // Generate some mock flights dynamically based on queries
    const flightDate = date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const airlines = [
        { code: '6E', name: 'IndiGo', logo: 'indigo' },
        { code: 'AI', name: 'Air India', logo: 'airindia' },
        { code: 'UK', name: 'Vistara', logo: 'vistara' },
        { code: 'SG', name: 'SpiceJet', logo: 'spicejet' }
    ];

    const flights = airlines.map((airline, idx) => {
        const depHour = 6 + idx * 4;
        const arrHour = (depHour + 2) % 24;
        const depTime = `${String(depHour).padStart(2, '0')}:15`;
        const arrTime = `${String(arrHour).padStart(2, '0')}:45`;
        
        // Base price calculation depending on index and cabin class multiplier
        let price = 4500 + idx * 850;
        if (cabinClass === 'Premium Economy') price *= 1.5;
        if (cabinClass === 'Business') price *= 3;
        if (cabinClass === 'First') price *= 5;

        return {
            flightNumber: `${airline.code}-${100 + idx * 37}`,
            airline: airline.name,
            airlineCode: airline.code,
            logo: airline.logo,
            from,
            to,
            date: flightDate,
            departureTime: depTime,
            arrivalTime: arrTime,
            duration: '2h 30m',
            stops: 0,
            price: Math.round(price),
            currency: 'INR',
            seatsAvailable: 12 - idx * 2,
            cabinClass
        };
    });

    res.json({
        searchCriteria: { from, to, date: flightDate, cabinClass },
        results: flights
    });
}

async function searchHotels(req, res) {
    const { city = 'Mumbai', checkIn, checkOut, guests = 2 } = req.query;
    
    const checkInDate = checkIn || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const checkOutDate = checkOut || new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const hotelTemplates = [
        {
            name: 'Grand Hyatt',
            stars: 5,
            rating: 4.7,
            amenities: ['Free WiFi', 'Pool', 'Spa', 'Gym', 'Restaurant', 'Bar'],
            basePrice: 8500
        },
        {
            name: 'Taj Palace',
            stars: 5,
            rating: 4.9,
            amenities: ['Free WiFi', 'Pool', 'Heritage Tour', 'Spa', 'Butler Service'],
            basePrice: 12500
        },
        {
            name: 'Novotel Hotel',
            stars: 4,
            rating: 4.2,
            amenities: ['Free WiFi', 'Pool', 'Beach Front', 'Kids Play Area'],
            basePrice: 6000
        },
        {
            name: 'Ginger Business Hotel',
            stars: 3,
            rating: 3.8,
            amenities: ['Free WiFi', 'Gym', 'Cafeteria'],
            basePrice: 3200
        }
    ];

    const results = hotelTemplates.map((h, idx) => {
        const rooms = [
            { type: 'Standard Room', price: h.basePrice, description: 'Comfortable standard room with basic amenities' },
            { type: 'Deluxe Room', price: Math.round(h.basePrice * 1.3), description: 'Spacious room with pool or city view' },
            { type: 'Executive Suite', price: Math.round(h.basePrice * 1.8), description: 'Premium suite with lounge access and jacuzzi' }
        ];

        return {
            id: `hotel-gds-${idx + 1}`,
            name: `${h.name} ${city}`,
            city,
            stars: h.stars,
            rating: h.rating,
            amenities: h.amenities,
            rooms,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            guests: parseInt(guests),
            address: `${idx * 12 + 10}, Marine Drive, ${city}`
        };
    });

    res.json({
        searchCriteria: { city, checkIn: checkInDate, checkOut: checkOutDate, guests },
        results
    });
}

module.exports = {
    searchFlights,
    searchHotels
};
