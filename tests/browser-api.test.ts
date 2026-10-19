import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { usernameIdentity } from '../src/lib/browser-api';
test('identificador de usuário do Pages corresponde ao identificador do servidor', async () => {
  const expected = createHash('sha256').update('aluno.teste').digest('hex') + '@accounts.notaclara.invalid';
  assert.equal(await usernameIdentity('  ALUNO.Teste  '),expected);
});
test('identificador do Pages rejeita usuário fora do formato permitido', async () => {
  for (const value of ['ab','aluno@escola.com','aluno teste','a'.repeat(31)]) await assert.rejects(usernameIdentity(value));
});
