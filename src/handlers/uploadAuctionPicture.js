import { StatusCodes } from "http-status-codes";

async function uploadAuctionPicture(event) {
    return {
        statusCode: StatusCodes.OK,
        body: JSON.stringify({}),
    };
}

export const handler = uploadAuctionPicture;