import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { connectDb } from './services/db.service';
import { sendMessage } from './services/openai.service';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    try {
        console.log('{!} Function HANDLER:', JSON.stringify(event));
        const method = event.requestContext.http.method;

        const pathParts = event.rawPath.split('/').filter(part => part.length);
        let route;
        if (pathParts.length) {
            route = pathParts[0];
        }
        console.log('{!} Function METHOD:', method, '{!} Function ROUTE:', route);

        switch (route) {
            case 'start':
                const threadId = uuidv4();
                return {
                    statusCode: 200,
                    body: JSON.stringify({ thread_id: threadId }),
                };
            case 'chat':
                try {
                    await connectDb();
                } catch (error) {
                    console.error('Error connecting to the database', error);
                    return {
                        statusCode: 500,
                        body: 'Error connecting to the database',
                    };
                }

                if (!event.body) {
                    return {
                        statusCode: 400,
                        body: 'Insufficient data',
                    };
                }
                const body = JSON.parse(event.body!) as { message: { text: string; url?: string }; thread_id: string };
                console.log('BODY:', body);
                if (!body.thread_id) {
                    return {
                        statusCode: 400,
                        body: 'No thread_id',
                    };
                }
                if (!body.message || !body.message.text) {
                    return {
                        statusCode: 400,
                        body: 'Insufficient data',
                    };
                }

                const response = await sendMessage(body.thread_id, body.message);

                return {
                    statusCode: 200,
                    body: JSON.stringify({ response }),
                };
        }

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
            },
            body: '',
        };
    } catch (error: any) {
        console.log('ERROR:', error);
        console.error(error);
        return {
            statusCode: 400,
            body: JSON.stringify(error.message || error),
        };
    }
};
