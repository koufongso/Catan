import { StatusCodes } from "../constants/StatusCodes.js";

export const StatusCodesUtils = Object.freeze({
    isRequestSuccessful(res) {
        if (res.status !== StatusCodes.SUCCESS) {
            console.log("Response status:", res.status);
            if (res.error_message) {
                console.error("Error message:", res.error_message);
            }
            return false;
        }
        return true;
    }
});