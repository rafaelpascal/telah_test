import axios, { AxiosRequestConfig } from "axios";
import FormData from "form-data";
import qs from "qs";
import dotenv from "dotenv";
import prisma from "../../packages/libs/prisma";
import { saveMessageReport } from "../message.helper";

dotenv.config({ path: "../../.env" });

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

const saveToken = async (tokenData: TokenResponse): Promise<boolean> => {
  try {
    const expiresAt = Date.now() + tokenData.expires_in * 1000;

    const existingToken = await prisma.mailToken.findUnique({
      where: { serviceName: "appmart_vas" },
    });

    if (existingToken) {
      if (existingToken.expiresIn < Date.now()) {
        await prisma.mailToken.update({
          where: { serviceName: "appmart_vas" },
          data: {
            accessToken: tokenData.access_token,
            tokenType: tokenData.token_type,
            expiresIn: expiresAt,
            scope: tokenData.scope,
          },
        });
        return true;
      } else {
        return false;
      }
    } else {
      await prisma.mailToken.create({
        data: {
          serviceName: "appmart_vas",
          accessToken: tokenData.access_token,
          tokenType: tokenData.token_type,
          expiresIn: expiresAt,
          scope: tokenData.scope,
        },
      });
      return true;
    }
  } catch (error) {
    console.error("Error saving token:", error);
    return false;
  }
};

const getToken = async (): Promise<string> => {
  try {
    const tokenDoc = await prisma.mailToken.findUnique({
      where: { serviceName: "appmart_vas" },
    });

    if (tokenDoc && tokenDoc.expiresIn > Date.now()) {
      return tokenDoc.accessToken;
    }

    const response = await axios.post<TokenResponse>(
      "https://api.appmartgroup.com/appmartServices/auth/getToken",
      qs.stringify({
        serviceName: process.env.SERVICE_NAME,
        cleintID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        grantType: "client_credentials",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const tokenData = response.data;
    await saveToken(tokenData);
    return tokenData.access_token;
  } catch (error: any) {
    console.error(
      "Error retrieving new token:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const sendEmail = async (
  email: string,
  message: string | undefined,
  subject: string
): Promise<string | false | { success: boolean; message: string }> => {
  try {
    const accessToken = await getToken();
    if (!accessToken) {
      await saveMessageReport({
        sender: "Revotax",
        recipient: email,
        send_message: subject,
        status: "FAILED",
      });
      return {
        success: false,
        message: "Failed to retrieve Access Token.",
      };
    }

    const formData = new FormData();
    formData.append("to", email);
    formData.append("senderName", "Appmart bulk sms service");
    formData.append("senderEmail", "noreply@veripay.ng");
    formData.append("vendor_code", "788897564");
    formData.append("encoded", "false");
    formData.append("isHtml", "true");
    formData.append("subject", subject);
    formData.append("attachmentType", "single");
    formData.append("msgBody", message);
    formData.append("clientID", "2550515721");

    const config: AxiosRequestConfig = {
      method: "post",
      url: "https://api.appmartgroup.com/appmartServices/mail/send",
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${accessToken}`,
      },
      data: formData,
    };

    const response = await axios(config);
    await saveMessageReport({
      sender: "Revotax",
      recipient: email,
      send_message: subject,
      status: "SUCCESS",
    });
    return response.data.message;
  } catch (error: any) {
    console.error(
      "Error sending email:",
      error.response?.data || error.message
    );
    return false;
  }
};
