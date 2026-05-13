import { lucia } from "lucia";
import { mongoose as mongooseAdapter } from "@lucia-auth/adapter-mongoose";
import { User } from "$lib/server/models/User.js"; 
import { Session } from "$lib/server/models/Session.js";
import { Key } from "$lib/server/models/Key.js";
import { LUCIA_SECRET } from "$env/static/private";

export const authErrorMessages = {
  AUTH_INVALID_KEY_ID: "Invalid email or username. Please check and try again.",
  AUTH_INVALID_KEY:
    "The provided email or username is incorrect. Please verify your details.",
  AUTH_INVALID_PASSWORD: "Incorrect password. Please try again.",
  AUTH_DUPLICATE_KEY_ID:
    "An account with this email, username, or phone number already exists. Please log in or use a different one.",
  AUTH_EXPIRED_SESSION:
    "Your session has expired. Please log in again to continue.",
  AUTH_INVALID_SESSION_ID:
    "Your session is no longer valid. Please log in again.",
  AUTH_NOT_AUTHENTICATED: "You need to log in to access this feature.",
  AUTH_INVALID_USER_ID: "The user ID provided is incorrect.",
  AUTH_INVALID_PROVIDER_ID: "The authentication method is not supported.",
  AUTH_DUPLICATE_USER_ID: "An account with this ID already exists.",
  AUTH_PROVIDER_NOT_SUPPORTED:
    "This login method is not supported. Please use a different method.",
  AUTH_TOKEN_INVALID:
    "The authentication token is invalid. Please log in again.",
  AUTH_TOKEN_EXPIRED: "Your login session has expired. Please log in again.",
  AUTH_MISSING_KEY_ID: "An email or username is required to log in.",
  AUTH_MISSING_PASSWORD: "Please enter your password to continue.",
  AUTH_MISSING_USER_ID:
    "User information is missing. Please try logging in again.",
  AUTH_UNSUPPORTED_OPERATION: "This action is not allowed.",
  AUTH_INVALID_INPUT:
    "Some details entered are incorrect. Please review and try again.",
  AUTH_INVALID_METADATA:
    "There was an issue processing your request. Please contact support if the problem persists.",
};

export const auth = lucia({
  adapter: mongooseAdapter({ User, Key, Session }), 
  env: "PROD", 
  secret: LUCIA_SECRET,
  cookies: {
    secure: true, 
  },
  transformUser: (user) => ({
    id: user.id.toString(),
    username: user.username,
    email: user.email,
    // phone: user.phone,
  }),
  getUserAttributes: (databaseUser) => {
    return {
      username: databaseUser.username,
      email: databaseUser.email,
    };
  },
});

export default auth;