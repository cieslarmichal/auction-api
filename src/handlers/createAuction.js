import {v4 as uuid} from 'uuid';
import AWS from 'aws-sdk';
import { StatusCodes } from 'http-status-codes';
import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import createError from 'http-errors';

const dynamoDb = new AWS.DynamoDB.DocumentClient();

async function createAuction(event, context) {
  const {title} = event.body;

  const now = new Date();

  const auction = {
    id: uuid(),
    title,
    status: 'OPEN',
    createdAt: now.toISOString(),
  };

  try {
    await dynamoDb.put({
      TableName: process.env.AUCTIONS_TABLE_NAME,
      Item: auction,
    }).promise();
  } catch(error){
    console.error(error);
    throw new createError.InternalServerError(error);
  }


  return {
    statusCode: StatusCodes.CREATED,
    body: JSON.stringify(auction),
  };
}

export const handler = middy(createAuction)
  .use(httpJsonBodyParser())
  .use(httpEventNormalizer())
  .use(httpErrorHandler());
