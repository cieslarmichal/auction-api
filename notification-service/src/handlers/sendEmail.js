import AWS from 'aws-sdk';

const ses = new AWS.SES({ region: 'eu-west-1' });

async function sendEmail(event, context) {
  const record = event.Records[0];
  console.log(record);

  const email = JSON.parse(record.body);

  const { subject, body, recipient } = email;

  const params = {
    Source: 'michal.andrzej.cieslar@gmail.com',
    Destination: {
      ToAddresses: [recipient],
    },
    Message: {
      Body: {
        Text: {
          Data: body,
        },
      },
      Subject: {
        Data: subject,
      },
    },
  };

  try {
    const result = await ses.sendEmail(params).promise();
    console.log(result);
    return result;
  } catch (error) {
    console.error(error);
  }
}

export const handler = sendEmail;
