import { registerRoute } from 'workbox-routing';
import Payper from '../../worker';

const payper = new Payper();

registerRoute(
  function matcher({ url, request, event }) {
    return payper.matches(request);
  },
  async function handler({ event }) {
    return await payper.concat(event);
  }
);
