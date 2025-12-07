// controllers/properties.controller.js
import { supabase } from '../config/supabase.js';
import redis from "../config/redis.js";

// GET /api
export async function getAllProperties(req, res) {
  try {
    const cacheKey = "destinations:all";

    // 1. Check Redis cache
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      console.log("Returning cached destinations from Redis");
      return res.json(JSON.parse(cachedData));
    }

    // 2. Cache miss → fetch from Supabase
    const { data, error } = await supabase
      .from("destinations")
      .select("*");

    if (error) throw error;

    await redis.set(cacheKey, JSON.stringify(data), "EX", 1800);

    console.log("Destinations loaded from DB and cached");

    return res.json(data || []);
  } catch (err) {
    console.error("Error fetching properties:", err);
    return res.status(500).json({ message: "Failed to load destinations" });
  }
}


//GET api/search
export async function searchProperties(req, res) {
  const { destination, guests } = req.query;

  if (!destination) {
    return res.status(400).json({ message: "Destination is required" });
  }

  // Unique cache key for this search
  const cacheKey = `search:${destination.toLowerCase()}:${guests || "any"}`;

  try {
    // 1️⃣ Try Redis Cache First
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log("⚡ Redis Cache Hit →", cacheKey);
      return res.json(JSON.parse(cached));
    }

    console.log("⏳ Redis Cache Miss →", cacheKey);

    // 2️⃣ Fetch from Supabase
    const { data, error } = await supabase
      .from("hotels")
      .select("*")
      .ilike("city", `%${destination}%`);

    if (error) throw error;

    const result = data || [];

    // 3️⃣ Store in Redis (TTL = 10 minutes)
    await redis.set(cacheKey, JSON.stringify(result), "EX", 600);

    return res.json(result);

  } catch (err) {
    console.error("Search Properties Error:", err);
    return res.status(500).json({ message: "Failed to search hotels" });
  }
}

/*
export async function searchProperties(req, res) {
  try {
    const { destination = '', guests = '' } = req.query;

    const dest = destination.trim().toLowerCase();
    const guestCount = parseInt(guests, 10) || 1;

    if (!dest) {
      return res.status(400).json({ message: "Destination is required" });
    }

    const { data, error } = await supabase
      .from('hotels_rooms_search')
      .select('*')
      .gte('max_guests', guestCount)
      .or(`(hotel_city.ilike.%${dest}%,hotel_name.ilike.%${dest}%)`);

    if (error) {
      console.error("Supabase search error:", error.message);
      return res.status(500).json({ message: "Search failed" });
    }

    return res.json(data || []);
  } catch (err) {
    console.error("searchProperties error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}*/

// GET /api/details/:destination
export async function getPropertyDetails(req, res) {
  try {
    const destination = req.params.destination?.trim() || '';

    if (!destination) {
      return res.status(400).json({ message: "Destination is required" });
    }

    // Create Redis cache key
    const cacheKey = `propertyDetails:${destination.toLowerCase()}`;

    // Check Redis cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log("⚡ Redis Cache Hit →", cacheKey);
      return res.status(200).json(JSON.parse(cached));
    }

    console.log("⏳ Redis Cache Miss →", cacheKey);

    // -------------------------------------------------------
    // Fetch destinations + hotels from Supabase
    // -------------------------------------------------------
    const { data: destinations, error: destError } = await supabase
      .from('destinations')
      .select('*')
      .ilike('city', `%${destination}%`);

    if (destError) throw destError;

    const { data: hotels, error: hotelError } = await supabase
      .from('hotels')
      .select('*')
      .ilike('city', `%${destination}%`);

    if (hotelError) throw hotelError;

    if (!hotels || hotels.length === 0) {
      return res.status(404).json({ message: `No hotels found in ${destination}` });
    }

    const dest = destinations?.[0] || null;

    // -------------------------------------------------------
    // Fetch rooms for each hotel
    // -------------------------------------------------------
    const hotelsWithRooms = await Promise.all(
      hotels.map(async (hotel) => {
        const { data: rooms, error: roomError } = await supabase
          .from('rooms')
          .select(`
            id,
            room_number,
            room_type,
            price_per_night,
            max_guests,
            is_available,
            room_amenities (
              amenities (
                id,
                name
              )
            )
          `)
          .eq('hotel_id', hotel.id);

        if (roomError) throw roomError;

        // Format rooms
        const formattedRooms = rooms.map((room) => ({
          ...room,
          amenities: (room.room_amenities || []).map((ra) => ra.amenities),
        }));

        return {
          ...hotel,
          rooms: formattedRooms,
        };
      })
    );

    const response = {
      ...dest,
      hotels: hotelsWithRooms
    };

    // -------------------------------------------------------
    // Save to Redis cache (TTL 10 minutes)
    // -------------------------------------------------------
    await redis.set(cacheKey, JSON.stringify(response), "EX", 600);

    return res.status(200).json(response);

  } catch (error) {
    console.error("Error in getPropertyDetails:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
}

export async function getSearchPropertyDetails(req, res) {
  try {
    const destination = req.params.destination?.trim() || '';

    if (!destination) {
      return res.status(400).json({ message: "Destination is required" });
    }

    // Redis Cache Key (unique per hotel name search)
    const cacheKey = `searchPropertyDetails:${destination.toLowerCase()}`;

    // Check Redis cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log("⚡ Redis Cache Hit →", cacheKey);
      return res.json(JSON.parse(cached));
    }

    console.log("⏳ Redis Cache Miss →", cacheKey);

    // -------------------------------------------------------
    // Step 1: Find hotel(s) by name
    // -------------------------------------------------------
    const { data: hotels, error: hotelError } = await supabase
      .from("hotels")
      .select("*")
      .ilike("name", destination);

    if (hotelError) throw hotelError;

    if (!hotels || hotels.length === 0) {
      return res.status(404).json({ message: "Hotel not found" });
    }

    const hotel = hotels[0];

    // -------------------------------------------------------
    // Step 2: Fetch rooms for that hotel
    // -------------------------------------------------------
    const { data: rooms, error: roomError } = await supabase
      .from("rooms")
      .select(`
        id,
        room_number,
        room_type,
        price_per_night,
        max_guests,
        is_available,
        room_amenities (
          amenities (
            id,
            name
          )
        )
      `)
      .eq("hotel_id", hotel.id);

    if (roomError) throw roomError;

    const formattedRooms = rooms.map((room) => ({
      ...room,
      amenities: (room.room_amenities || []).map((ra) => ra.amenities),
    }));

    const response = {
      ...hotel,
      rooms: formattedRooms,
    };

    // -------------------------------------------------------
    // Cache the response (TTL = 10 minutes)
    // -------------------------------------------------------
    await redis.set(cacheKey, JSON.stringify(response), "EX", 600);

    return res.json(response);

  } catch (error) {
    console.error("Error in getSearchPropertyDetails:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
}


export async function updateProfile(req, res) {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Missing token" });
    }

    const { name, email } = req.body;

    // Step 1: Validate token & get user
    const { data: userData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !userData?.user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const userId = userData.user.id;

    // Step 2: Update user (email + metadata)
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      email: email,
      user_metadata: {
        name: name
      }
    });

    if (error) {
      console.error("Profile update error:", error.message);
      return res.status(400).json({ message: error.message });
    }

    return res.json({ message: "Profile updated successfully", user: data });

  } catch (err) {
    console.error("updateProfile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
