import AWS from 'aws-sdk';
import { StatusCodes } from 'http-status-codes';
import { commonMiddleware } from '../shared';
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

export const handler = commonMiddleware(getAuctions);
