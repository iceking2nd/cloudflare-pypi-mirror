/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import { trimStart, split, replace } from 'lodash-es'

export default {
	async fetch(request, env, ctx) {

		const PyFiles = "http[s]?://files.pythonhosted.org";

		const url = new URL(request.url);
		console.debug(`request url: ${url}, protocol: ${url.protocol}, hostname: ${url.hostname}, port: ${url.port}, path: ${url.pathname}, hash: ${url.hash}`)

		console.debug(`identifier: ${split(url.pathname, '/', 2)[1]}`)

		switch (split(url.pathname, '/', 2)[1]) {
			case '~files':
				try {
					const newURL = new URL(trimStart(url.pathname,"/~files"), `https://files.pythonhosted.org`);
					const response = await fetch(newURL);
					return new Response(response.body, {
						status: response.status,
						headers: response.headers,
					});

				} catch (error) {
					return new Response(`File fetch failed: ${error.message}`, { status: 502 });
				}
			default:
				const newUrl = new URL(url.pathname, `https://pypi.org`);
				console.debug(`new url: ${newUrl}`)

				const newReq = new Request(newUrl,{
					method: request.method,
					headers: (request) => {
								const newReqHeaders = new Headers(request.headers);
								newReqHeaders.set("Accept-Encoding", "gzip, deflate");
								return newReqHeaders;
					},
					redirect: "follow",
				});
				const resp = await fetch(newReq);

				const newHeaders = new Headers();
				resp.headers.forEach((value, key) => {
					newHeaders.set(key,value);
				})
				const body = await resp.text();
				let newBody = replace(body, new RegExp(PyFiles,"g"), `${url.protocol}//${url.hostname}${url.port === "80" || url.port === "443" || url.port === "" ? "" : ":"+url.port }/~files`);
				newHeaders.set("content-length", String(newBody.length));
				return new Response(newBody,{
					status: resp.status,
					headers: newHeaders
				})
		}
	}
};
