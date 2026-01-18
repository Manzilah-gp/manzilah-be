// controllers/islamicServiceController.js
import axios from "axios";

const ALADHAN_BASE_URL = "http://api.aladhan.com/v1";

// Fetch daily prayer times based on coordinates
export const getPrayerTimes = async (req, res) => {
  try {
    const { latitude, longitude, date, method = 4 } = req.query;

    // Validate required parameters
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    // Format date or use today (DD-MM-YYYY format)
    let targetDate;
    if (date) {
      targetDate = date;
    } else {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      targetDate = `${day}-${month}-${year}`;
    }

    // Call Aladhan API
    const apiUrl = `${ALADHAN_BASE_URL}/timings/${targetDate}`;
    console.log('Calling Aladhan API:', apiUrl, { latitude, longitude, method });
    
    const response = await axios.get(apiUrl, {
      params: {
        latitude,
        longitude,
        method, // Muslim World League by default
      },
    });
    
    console.log('Aladhan API Response:', response.data.code);

    if (response.data.code !== 200) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch prayer times",
      });
    }

    const { timings, date: hijriDate, meta } = response.data.data;

    // Extract only the 5 main prayers
    const prayerTimes = {
      fajr: timings.Fajr,
      dhuhr: timings.Dhuhr,
      asr: timings.Asr,
      maghrib: timings.Maghrib,
      isha: timings.Isha,
      sunrise: timings.Sunrise, // Bonus for reference
    };

    res.json({
      success: true,
      data: {
        prayerTimes,
        location: {
          latitude,
          longitude,
          timezone: meta.timezone,
        },
        date: {
          gregorian: hijriDate.gregorian.date,
          hijri: {
            date: hijriDate.hijri.date,
            month: hijriDate.hijri.month.en,
            year: hijriDate.hijri.year,
            designation: hijriDate.hijri.designation.abbreviated,
          },
        },
        method: meta.method.name,
      },
    });
  } catch (error) {
    console.error("Error fetching prayer times:", error.message);
    console.error("Error details:", error.response?.data || error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
      details: error.response?.data,
    });
  }
};

// Fetch monthly prayer times calendar
export const getMonthlyPrayerTimes = async (req, res) => {
  try {
    const { latitude, longitude, month, year, method = 4 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    // Use current month/year if not provided
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    // Call Aladhan API for calendar
    const response = await axios.get(
      `${ALADHAN_BASE_URL}/calendar/${targetYear}/${targetMonth}`,
      {
        params: {
          latitude,
          longitude,
          method,
        },
      }
    );

    if (response.data.code !== 200) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch monthly prayer times",
      });
    }

    // Format calendar data
    const calendar = response.data.data.map((day) => ({
      date: day.date.gregorian.date,
      hijriDate: day.date.hijri.date,
      timings: {
        fajr: day.timings.Fajr,
        dhuhr: day.timings.Dhuhr,
        asr: day.timings.Asr,
        maghrib: day.timings.Maghrib,
        isha: day.timings.Isha,
      },
    }));

    res.json({
      success: true,
      data: {
        calendar,
        month: targetMonth,
        year: targetYear,
      },
    });
  } catch (error) {
    console.error("Error fetching monthly prayer times:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Calculate Qibla direction from coordinates
export const getQiblaDirection = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    // Call Aladhan API for Qibla
    const response = await axios.get(
      `${ALADHAN_BASE_URL}/qibla/${latitude}/${longitude}`
    );

    if (response.data.code !== 200) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch Qibla direction",
      });
    }

    const { direction } = response.data.data;

    res.json({
      success: true,
      data: {
        direction: direction, // Degrees from North
        latitude,
        longitude,
      },
    });
  } catch (error) {
    console.error("Error fetching Qibla direction:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Convert Gregorian date to Hijri
export const getHijriDate = async (req, res) => {
  try {
    const { date } = req.query;

    // Format date as DD-MM-YYYY
    let targetDate;
    if (date) {
      targetDate = date;
    } else {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      targetDate = `${day}-${month}-${year}`;
    }

    // Call Aladhan API for conversion
    const apiUrl = `${ALADHAN_BASE_URL}/gToH/${targetDate}`;
    console.log('Calling Hijri API:', apiUrl);
    
    const response = await axios.get(apiUrl);

    if (response.data.code !== 200) {
      return res.status(500).json({
        success: false,
        message: "Failed to convert date",
      });
    }

    const hijri = response.data.data.hijri;

    res.json({
      success: true,
      data: {
        gregorian: targetDate,
        hijri: {
          date: hijri.date,
          day: hijri.day,
          month: {
            number: hijri.month.number,
            en: hijri.month.en,
            ar: hijri.month.ar,
          },
          year: hijri.year,
          designation: hijri.designation.abbreviated,
          weekday: hijri.weekday.en,
        },
      },
    });
  } catch (error) {
    console.error("Error converting date:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};