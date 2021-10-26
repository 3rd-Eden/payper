import { registerRoute } from 'workbox-routing';
import Payper from '../../worker';

const payper = new Payper();

registerRoute(
  function matcher({ request }) {
    return payper.matches(request);
  },
  async function handler({ event }) {
    return await payper.respond(event);
  }
);

payper.register(['install', 'activate', 'message']);
