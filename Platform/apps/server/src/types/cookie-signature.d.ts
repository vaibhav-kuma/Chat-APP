declare module "cookie-signature" {
  export function sign(val: string, secret: string): string;
  export function unsign(val: string, secret: string): string | false;
}
