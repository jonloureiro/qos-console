import { LoaderFunction, redirect } from "remix";

export const loader: LoaderFunction = () => {
  return redirect('/auth')
}

export default function IndexPage() {
  return (
    <div>QoS Console</div>
  );
}
