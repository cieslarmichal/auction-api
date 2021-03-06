import { StatusCodes } from "http-status-codes";
import { getAuctionById } from './getAuction';
import AWS from 'aws-sdk';
import middy from '@middy/core';
import httpErrorHandler from "@middy/http-error-handler";
import createError from 'http-errors';
import { uploadAuctionPictureSchema } from '../shared';
import validator from '@middy/validator';

const s3 = new AWS.S3();

const dynamoDb = new AWS.DynamoDB.DocumentClient();

async function uploadPictureToS3(key, body){
    const result = await s3.upload({
        Bucket: process.env.AUCTIONS_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentEncoding: 'base64',
        ContentType: 'image/jpeg',
    }).promise();

    return result.Location;
}

async function setAuctionPictureUrl(id, pictureUrl){
    const params = {
        TableName: process.env.AUCTIONS_TABLE_NAME,
        Key: { id },
        UpdateExpression: 'set pictureUrl = :pictureUrl',
        ExpressionAttributeValues: {
          ':pictureUrl': pictureUrl,
        },
        ReturnValues: 'ALL_NEW',
      };

    const result = await dynamoDb.update(params).promise();

    const updatedAuction = result.Attributes;

    return updatedAuction;
}

async function uploadAuctionPicture(event) {
    const {id} = event.pathParameters;

    const { email } = event.requestContext.authorizer;

    const auction = await getAuctionById(id);

    if (email !== auction.seller) {
      throw new createError.UnprocessableEntity('Picture can be only uploaded by auction seller');
    }

    const base64 = event.body.replace(/^data:image\/\w+;base64,/, '');

    const buffer = Buffer.from(base64, 'base64');

    try {
        const pictureUrl = await uploadPictureToS3(auction.id + '.jpg', buffer);

        const updatedAuction = await setAuctionPictureUrl(id, pictureUrl);

        return {
            statusCode: StatusCodes.OK,
            body: JSON.stringify(updatedAuction),
        };
    } catch (error) {
        console.log(error);
        throw new createError.InternalServerError(error);
    }
}

export const handler = middy(uploadAuctionPicture).use(httpErrorHandler()).use(
    validator({
      inputSchema: uploadAuctionPictureSchema,
      ajvOptions: {
        strict: false,
      },
    })
  );