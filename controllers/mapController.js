import 'dotenv/config';

const GOONG_API_KEY = process.env.GOONG_API_KEY; 
const GOONG_BASE_URL = 'https://rsapi.goong.io';

export const findPlace = async (req, res) => {
  try {
    const { input } = req.query;
    const url = `${GOONG_BASE_URL}/Place/Find?input=${encodeURIComponent(input)}&api_key=${GOONG_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const autocomplete = async (req, res) => {
  try {
    const { input } = req.query;
    const url = `${GOONG_BASE_URL}/Place/AutoComplete?input=${encodeURIComponent(input)}&api_key=${GOONG_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const geocode = async (req, res) => {
  try {
    const { address } = req.query;
    const url = `${GOONG_BASE_URL}/Geocode?address=${encodeURIComponent(address)}&api_key=${GOONG_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const placeDetail = async (req, res) => {
  try {
    const { place_id } = req.query;
    const url = `${GOONG_BASE_URL}/Place/Detail?place_id=${place_id}&api_key=${GOONG_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const direction = async (req, res) => {
  try {
    const { origin, destination, vehicle = 'car' } = req.query;
    const url = `${GOONG_BASE_URL}/Direction?origin=${origin}&destination=${destination}&vehicle=${vehicle}&api_key=${GOONG_API_KEY}&alternatives=true`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const reverseGeocode = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    // Goong API Reverse Geocoding format: latlng={lat},{lng}
    const url = `${GOONG_BASE_URL}/Geocode?latlng=${lat},${lng}&api_key=${GOONG_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};