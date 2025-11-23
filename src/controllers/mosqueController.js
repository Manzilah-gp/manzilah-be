import { MosqueModel } from "../models/MosqueModel.js";

export const createMosque = async (req, res) => {
    console.log("Create mosque route hit");

    const { mosque, location } = req.body;
    const createdBy = req.user.id;

    // Validate required fields
    if (!mosque || !mosque.name) {
        return res.status(400).json({ message: "Mosque name is required" });
    }

    if (!location || !location.latitude || !location.longitude) {
        return res.status(400).json({ message: "Location coordinates are required" });
    }

    try {
        // Use the model to create mosque with location
        const mosqueId = await MosqueModel.createWithLocation(mosque, location, createdBy);

        res.status(201).json({
            success: true,
            message: "Mosque added successfully",
            mosqueId: mosqueId,
            data: {
                mosque: {
                    id: mosqueId,
                    name: mosque.name,
                    contact_number: mosque.contact_number,
                    mosque_admin_id: mosque.mosque_admin_id,
                    created_by: createdBy
                },
                location: location
            }
        });

    } catch (error) {
        console.error("Error creating mosque:", error);
        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

export const getMosques = async (req, res) => {
    try {
        const mosques = await MosqueModel.findAll();

        res.json({
            success: true,
            data: mosques,
            count: mosques.length
        });

    } catch (error) {
        console.error("Error fetching mosques:", error);
        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

export const getMosqueById = async (req, res) => {
    try {
        const mosqueId = req.params.id;
        const mosque = await MosqueModel.findById(mosqueId);

        if (!mosque) {
            return res.status(404).json({
                success: false,
                message: "Mosque not found"
            });
        }

        res.json({
            success: true,
            data: mosque
        });

    } catch (error) {
        console.error("Error fetching mosque:", error);
        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

export const updateMosque = async (req, res) => {
    const mosqueId = req.params.id;
    const { mosque, location } = req.body;

    try {
        // Check if mosque exists
        const mosqueExists = await MosqueModel.exists(mosqueId);
        if (!mosqueExists) {
            return res.status(404).json({
                success: false,
                message: "Mosque not found"
            });
        }

        // Update mosque data if provided
        if (mosque) {
            await MosqueModel.update(mosqueId, mosque);
        }

        // Update location data if provided
        if (location) {
            await MosqueModel.updateLocation(mosqueId, location);
        }

        res.json({
            success: true,
            message: "Mosque updated successfully",
            mosqueId: mosqueId
        });

    } catch (error) {
        console.error("Error updating mosque:", error);
        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

export const deleteMosque = async (req, res) => {
    const mosqueId = req.params.id;

    try {
        // Check if mosque exists
        const mosqueExists = await MosqueModel.exists(mosqueId);
        if (!mosqueExists) {
            return res.status(404).json({
                success: false,
                message: "Mosque not found"
            });
        }

        await MosqueModel.delete(mosqueId);

        res.json({
            success: true,
            message: "Mosque deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting mosque:", error);
        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

// Additional controller methods for search and filtering
export const getMosquesByGovernorate = async (req, res) => {
    try {
        const { governorate } = req.params;
        const mosques = await MosqueModel.findByGovernorate(governorate);

        res.json({
            success: true,
            data: mosques,
            count: mosques.length
        });

    } catch (error) {
        console.error("Error fetching mosques by governorate:", error);
        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

export const searchMosques = async (req, res) => {
    try {
        const { name } = req.query;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Search term is required"
            });
        }

        const mosques = await MosqueModel.searchByName(name);

        res.json({
            success: true,
            data: mosques,
            count: mosques.length
        });

    } catch (error) {
        console.error("Error searching mosques:", error);
        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};