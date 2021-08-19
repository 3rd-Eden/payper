const __Not_The_Import_You_Are_Looking_For__ = `

If you see this message it means that you have imported 'payper' directly
instead importing the package that you actually need. Try to importing one of
the following packages instead:

   - require('payper/edge')
   - require('payper/server')
   - require('payper/worker')

This way you are only importing the code that you need. If you need more information
please the usage section of our README.

Thanks for using Payper <3

`;

throw new ReferenceError(__Not_The_Import_You_Are_Looking_For__);
