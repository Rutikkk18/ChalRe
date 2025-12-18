import { getToken } from "firebase/messaging";
import axios from "axios";
import { messaging } from "./firebase";

export async function registerFCMToken(jwtToken) {
    try {
        const token = await getToken(messaging, { vapidKey: "YOUR_VAPID_KEY" });

        await axios.post(
            "/api/notifications/register",
            {
                token: token,
                platform: "WEB"
            },
            {
                headers: {
                    Authorization: `Bearer ${jwtToken}`
                }
            }
        );

        console.log("Token registered:", token);

    } catch (err) {
        console.error("FCM token error", err);
    }
}
