import { StatusCodes } from "http-status-codes";
import { getAuctionById } from './getAuction';
import AWS from 'aws-sdk';

const s3 = new AWS.S3();

async function uploadPictureToS3(key, body){
    const result = await s3.upload({
        Bucket: process.env.AUCTIONS_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentEncoding: 'base64',
        ContentType: 'image/jpeg',
    }).promise();

    return result;
}

async function uploadAuctionPicture(event) {
    const {id} = event.pathParameters;

    const auction = await getAuctionById(id);

    const base64 = event.body.replace(/^data:image\/\w+;base64,/, '');

    const buffer = Buffer.from(base64, 'base64');

    const uploadPictureToS3Result = await uploadPictureToS3(auction.id + '.jpg', buffer);
    console.log(uploadPictureToS3Result);

    return {
        statusCode: StatusCodes.OK,
        body: JSON.stringify({}),
    };
}

export const handler = uploadAuctionPicture;