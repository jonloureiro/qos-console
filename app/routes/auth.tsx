import { Form } from "remix";

export default function AuthPage() {
  return (
    <div className=" flex justify-center items-center h-full w-full">

      <Form className="h-auto max-w-xs">
        <h1 className="text-4xl font-bold text-zinc-700">Login</h1>
        <label className="label flex-wrap">
          <span className="label-text">Email</span>
          <input type="email" className="input input-primary w-full" />
        </label>

        <label className="label flex-wrap">
          <span className="label-text">Senha</span>
          <input type="password" className="input input-primary w-full" />
        </label>

        <button type="submit" className="btn btn-primary btn-block">Entrar</button>
      </Form>

    </div>
  )
}