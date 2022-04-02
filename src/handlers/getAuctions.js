import AWS from 'aws-sdk';
import { StatusCodes } from 'http-status-codes';
import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import httpEventNormalizer from '@middy/http-event-normalizer';
import createError from 'http-errors';

const dynamoDb = new AWS.DynamoDB.DocumentClient();

async function getAuctions(event, context) {
  let auctions;

  try {
    const result = await dynamoDb.scan({TableName: process.env.AUCTIONS_TABLE_NAME}).promise();

    auctions = result.Items;
  } catch (error) {
    console.log(error);
    throw new createError.InternalServerError(error);
  }

  return {
    statusCode: StatusCodes.OK,
    body: JSON.stringify(auctions),
  };
}

export const handler = middy(getAuctions)
  .use(httpEventNormalizer())
  .use(httpErrorHandler());
