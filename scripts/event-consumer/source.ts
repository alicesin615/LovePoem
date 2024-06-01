// @ts-ignore
const lodash = await import('http://cdn.skypack.dev/lodash');

const url = 'http://tokenmaster.ap-southeast-1.elasticbeanstalk.com/api/event';
console.log(`HTTP GET Request to ${url}`);
// @ts-ignore
const eventRequest = Functions.makeHttpRequest({
    url: url,
    headers: {
        'Content-Type': 'application/json'
    },
    params: {
        // @ts-ignore
        id: args?.[0]
    }
});
// @ts-ignore
const eventResponse = await eventRequest;

console.log('eventResponse: ', eventResponse);
if (eventResponse.error) {
    console.error(eventResponse.error);
    throw Error('Request failed');
}

const data = eventResponse['data'];
if (data.Response === 'Error') {
    console.error(data.Message);
    throw Error(`Functional error. Read message: ${data.Message}`);
}

const { id, name, eventDate, ticketPrice, location, maxSupply, resaleAllowed } =
    data;
console.log('data: ', data);
const result = lodash.concat(
    [id],
    name,
    eventDate,
    ticketPrice,
    location
    // maxSupply,
    // resaleAllowed
);

// @ts-ignore
return Functions.encodeString(JSON.stringify(result));
