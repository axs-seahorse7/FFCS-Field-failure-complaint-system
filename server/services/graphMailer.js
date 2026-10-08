import { ConfidentialClientApplication } from "@azure/msal-node";
import dotenv from "dotenv";

dotenv.config();

const msalConfig = {
    auth: {
        clientId: process.env.CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
        clientSecret: process.env.CLIENT_SECRET,
    },
};

const cca = new ConfidentialClientApplication(msalConfig);

export const sendGraphEmail = async ({ to, subject, html }) => {
    try {
        const tokenResponse = await cca.acquireTokenByClientCredential({
            scopes: ["https://graph.microsoft.com/.default"],
        });

        if (!tokenResponse?.accessToken) {
            throw new Error("Failed to acquire Microsoft Graph access token");
        }

        const emailPayload = {
            message: {
                subject,
                body: {
                    contentType: "HTML",
                    content: html,
                },
                toRecipients: [
                    {
                        emailAddress: {
                            address: to,
                        },
                    },
                ],
            },
            saveToSentItems: true,
        };

        const response = await fetch(
            `https://graph.microsoft.com/v1.0/users/${process.env.SENDER_EMAIL}/sendMail`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${tokenResponse.accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(emailPayload),
            }
        );

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Graph API ${response.status}: ${errorData}`);
        }

        console.log(`✅ Graph email sent to ${to}`);

        return {
            success: true,
            status: response.status,
        };
    } catch (error) {
        console.error("❌ Graph email error:", error.message);
        throw error;
    }
};