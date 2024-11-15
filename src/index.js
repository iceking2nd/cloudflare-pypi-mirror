/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import _ from 'lodash-es'

export default {
	async fetch(request, env, ctx) {

		const Pypi = "pypi.org";
		const PyFiles = "files.pythonhosted.org";
		const routes = {
			["pypi." + env.CUSTOM_DOMAIN]: Pypi,
			["py-files." + env.CUSTOM_DOMAIN]: PyFiles,
		};

		function routeByHosts(host){
			if (host in routes) {
				return routes[host];
			}
			if (env.MODE === "debug") {
				return env.TARGET_UPSTREAM;
			}
			return "";
		}

		const url = new URL(request.url);
		const upstream = routeByHosts(url.hostname);
		if (upstream === "") {
			return new Response(
				JSON.stringify({
					routes: routes,
				}),
				{
					status: 404,
				}
			);
		}

		const newUrl = new URL("https://" + upstream + url.pathname);
		const newReq = new Request(newUrl,{
			method: request.method,
			headers: (request, upstream) => {
			switch (upstream) {
				case Pypi:
					const newReqHeaders = new Headers(request.headers);
					newReqHeaders.set("Accept-Encoding", "gzip, deflate");
					return newReqHeaders;
					default:
						return request.headers;
			}
			},
			redirect: "follow",
		});
		const resp = await fetch(newReq);

		const newHeaders = new Headers();
		resp.headers.forEach((value, key) => {
			newHeaders.set(key,value);
		})
		switch (upstream) {
			case Pypi:
				const body = await resp.text();
				let newBody = _.replace(body, new RegExp(PyFiles,"g"),_.findKey(routes,function(o){
					return o === PyFiles;
				}));
				newHeaders.set("content-length", String(newBody.length));
				return new Response(newBody,{
					status: resp.status,
					headers: newHeaders
				})
			default:
				return new Response(resp.body,{
					status: resp.status,
					headers: resp.headers,
				})
		}
	},
};
