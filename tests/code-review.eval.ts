import { defineSuite, exact } from '@/lib/eval'

type Case = {
	diff: string
	comment: string
	expected: 'correct' | 'incorrect'
	tags?: string[]
}

const CASES: Case[] = [
	// === Real bugs the comment correctly identifies ===
	{
		diff: `function getUser(id) {
-  return users.find(u => u.id = id)
+  return users.find(u => u.id == id)
}`,
		comment: 'Use === instead of == for strict equality.',
		expected: 'correct',
		tags: ['real-bug', 'js'],
	},
	{
		diff: `def divide(a, b):
+    return a / b`,
		comment: 'This will throw ZeroDivisionError if b is 0 — handle that case.',
		expected: 'correct',
		tags: ['real-bug', 'python'],
	},
	{
		diff: `+for (let i = 0; i <= arr.length; i++) {
+  console.log(arr[i])
+}`,
		comment: 'Off-by-one: condition should be i < arr.length, not <=.',
		expected: 'correct',
		tags: ['real-bug', 'js'],
	},
	{
		diff: `+const total = items.reduce((s, x) => s + x.price)`,
		comment: 'reduce without an initial value will throw on an empty array. Pass 0 as the second arg.',
		expected: 'correct',
		tags: ['real-bug', 'js'],
	},
	{
		diff: `+if (user.role = 'admin') {
+  grantAccess()
+}`,
		comment: 'Assignment instead of comparison — should be ===.',
		expected: 'correct',
		tags: ['real-bug', 'js'],
	},
	{
		diff: `+func saveUser(u User) {
+    db.Save(&u)
+}`,
		comment: "saveUser doesn't return an error, so callers can't tell if the save failed.",
		expected: 'correct',
		tags: ['real-bug', 'go'],
	},
	{
		diff: `+const password = "hunter2"
+const hash = md5(password)`,
		comment: 'MD5 is not suitable for password hashing — use bcrypt or argon2.',
		expected: 'correct',
		tags: ['real-bug', 'security'],
	},
	{
		diff: `+const query = "SELECT * FROM users WHERE id = " + req.params.id`,
		comment: 'SQL injection — use a parameterized query.',
		expected: 'correct',
		tags: ['real-bug', 'security'],
	},
	{
		diff: `+try:
+    result = expensive_call()
+except:
+    pass`,
		comment: 'Bare except swallows everything including KeyboardInterrupt — catch a specific exception.',
		expected: 'correct',
		tags: ['real-bug', 'python'],
	},
	{
		diff: `+std::vector<int> v;
+v.reserve(10);
+for (int i = 0; i < 10; i++) {
+    v[i] = i;
+}`,
		comment: "reserve() doesn't change size — accessing v[i] is undefined behavior. Use push_back or resize.",
		expected: 'correct',
		tags: ['real-bug', 'cpp'],
	},
	{
		diff: `+async function load() {
+  const data = fetch('/api/data')
+  return data.json()
+}`,
		comment: 'Missing await on fetch() — calling .json() on the unresolved promise will fail.',
		expected: 'correct',
		tags: ['real-bug', 'js', 'async'],
	},
	{
		diff: `+pub fn first(v: Vec<i32>) -> i32 {
+    v[0]
+}`,
		comment: 'This panics on empty input. Return Option<i32> or use .first().copied().',
		expected: 'correct',
		tags: ['real-bug', 'rust'],
	},
	{
		diff: `+useEffect(() => {
+  fetchData().then(setData)
+}, [])`,
		comment:
			'Race condition: if the component unmounts before fetch resolves, setData runs on an unmounted component.',
		expected: 'correct',
		tags: ['real-bug', 'react'],
	},
	{
		diff: `+def get_config():
+    with open('config.json') as f:
+        return json.load(f)
+    f.close()`,
		comment: 'f.close() is unreachable — and the with-block already closes the file.',
		expected: 'correct',
		tags: ['real-bug', 'python'],
	},
	{
		diff: `+let cache = {}
+function memoize(key, fn) {
+  if (cache[key]) return cache[key]
+  cache[key] = fn()
+  return cache[key]
+}`,
		comment: 'cache[key] === 0 or "" or false will be treated as a miss. Use \`key in cache\` instead.',
		expected: 'correct',
		tags: ['real-bug', 'js'],
	},
	{
		diff: `+function isEven(n) {
+  return n % 2 == 0
+}
+isEven(2.5)`,
		comment: 'Returns true for 2.5 because 2.5 % 2 === 0.5, but the user might pass non-integers.',
		expected: 'incorrect',
		tags: ['confused-comment'],
	},
	{
		diff: `+const sum = (a, b) => a + b
+sum(1, 2)`,
		comment: 'Should use function declaration instead of arrow function for hoisting.',
		expected: 'incorrect',
		tags: ['nitpick-wrong'],
	},
	{
		diff: `+const items = ['a', 'b', 'c']
+for (const item of items) {
+  console.log(item)
+}`,
		comment: 'for...of on arrays is slower than a classic for loop — switch back.',
		expected: 'incorrect',
		tags: ['micro-opt-wrong'],
	},
	{
		diff: `+if (user) {
+  return user.name
+}`,
		comment: 'Use user?.name to avoid the if entirely.',
		expected: 'correct',
		tags: ['style-valid'],
	},

	// === Real bugs the comment misses or misidentifies ===
	{
		diff: `+def factorial(n):
+    if n == 0:
+        return 0
+    return n * factorial(n - 1)`,
		comment: 'Looks good — clean recursive implementation.',
		expected: 'incorrect',
		tags: ['missed-bug', 'python'],
	},
	{
		diff: `+function transferFunds(from, to, amount) {
+  from.balance -= amount
+  to.balance += amount
+}`,
		comment: 'Add a comment explaining what this does.',
		expected: 'incorrect',
		tags: ['missed-bug', 'wrong-focus'],
	},
	{
		diff: `+const userId = req.headers['x-user-id']
+db.users.delete(userId)`,
		comment: 'Use req.headers.userId for cleaner access.',
		expected: 'incorrect',
		tags: ['missed-bug', 'security'],
	},
	{
		diff: `+let counter = 0
+for (let i = 0; i < 1000; i++) {
+  setTimeout(() => counter++, 0)
+}
+console.log(counter)`,
		comment: 'Use forEach instead of a for loop for readability.',
		expected: 'incorrect',
		tags: ['missed-bug', 'wrong-focus'],
	},
	{
		diff: `+def parse_age(s):
+    return int(s)`,
		comment: 'Add type hints to make the function self-documenting.',
		expected: 'incorrect',
		tags: ['missed-bug', 'wrong-focus'],
	},
	{
		diff: `+std::string get() {
+    char buf[256];
+    sprintf(buf, "hello");
+    return buf;
+}`,
		comment: 'Use std::string instead of std::string for the parameter type.',
		expected: 'incorrect',
		tags: ['missed-bug', 'nonsense'],
	},

	// === Style/preference comments that are reasonable ===
	{
		diff: `+const x = a == null ? defaultVal : a`,
		comment: 'Could simplify to a ?? defaultVal.',
		expected: 'correct',
		tags: ['style-valid'],
	},
	{
		diff: `+if (xs.filter(x => x.active).length > 0) {
+  process()
+}`,
		comment: 'Use xs.some(x => x.active) — short-circuits and reads better.',
		expected: 'correct',
		tags: ['style-valid'],
	},
	{
		diff: `+let result = ''
+for (const s of strings) {
+  result += s + ','
+}`,
		comment: 'Use strings.join(",") — clearer and faster, no trailing comma.',
		expected: 'correct',
		tags: ['style-valid'],
	},
	{
		diff: `+if (status === 'ok') {
+  return true
+} else {
+  return false
+}`,
		comment: 'Just return status === "ok".',
		expected: 'correct',
		tags: ['style-valid'],
	},
	{
		diff: `+const arr = []
+for (let i = 0; i < 10; i++) arr.push(i * 2)`,
		comment: 'Use Array.from({ length: 10 }, (_, i) => i * 2) for a one-liner.',
		expected: 'correct',
		tags: ['style-valid'],
	},

	// === Comments that are technically wrong ===
	{
		diff: `+const items = arr.map(x => x.value).filter(Boolean)`,
		comment: 'filter(Boolean) drops 0 — use filter(x => x != null) if you want to keep falsy values.',
		expected: 'correct',
		tags: ['real-bug', 'subtle'],
	},
	{
		diff: `+function fetchUser(id: string) {
+  return fetch(\`/api/users/\${id}\`).then(r => r.json())
+}`,
		comment: 'TypeScript will infer the return type — no need to annotate.',
		expected: 'incorrect',
		tags: ['confused-comment'],
	},
	{
		diff: `+const user = users.find(u => u.id === id)
+console.log(user.name)`,
		comment: 'find() returns undefined when no match, dereferencing .name will crash. Add a guard.',
		expected: 'correct',
		tags: ['real-bug', 'js'],
	},
	{
		diff: `+for (const key of Object.keys(obj)) {
+  console.log(obj[key])
+}`,
		comment: "Use Object.values(obj) directly — you don't need the keys.",
		expected: 'correct',
		tags: ['style-valid'],
	},
	{
		diff: `+const cleanup = () => clearInterval(interval)
+useEffect(() => {
+  const interval = setInterval(tick, 1000)
+  return cleanup
+}, [])`,
		comment: 'cleanup closes over the wrong `interval` — declare cleanup inside the effect.',
		expected: 'correct',
		tags: ['real-bug', 'react'],
	},
	{
		diff: `+if (process.env.NODE_ENV === 'production') {
+  console.log('hi')
+}`,
		comment: 'console.log in production — strip it.',
		expected: 'correct',
		tags: ['style-valid'],
	},
	{
		diff: `+const handler = (e) => {
+  e.preventDefault()
+  submit()
+}
+button.addEventListener('click', handler)
+button.removeEventListener('click', () => handler)`,
		comment: 'removeEventListener takes a different reference — listener is never actually removed.',
		expected: 'correct',
		tags: ['real-bug', 'js'],
	},
	{
		diff: `+async function process(items) {
+  items.forEach(async (item) => {
+    await save(item)
+  })
+  console.log('done')
+}`,
		comment: 'forEach ignores the returned promise — "done" prints before saves complete.',
		expected: 'correct',
		tags: ['real-bug', 'async'],
	},
	{
		diff: `+const sum = (a: number, b: number) => a + b
+sum(1, '2' as any)`,
		comment: 'Use \`as unknown as number\` for a slightly safer cast.',
		expected: 'incorrect',
		tags: ['confused-comment'],
	},
	{
		diff: `+let i = 0
+while (true) {
+  if (i > 100) break
+  process(i++)
+}`,
		comment: 'Just write \`for (let i = 0; i <= 100; i++) process(i)\` — easier to read.',
		expected: 'correct',
		tags: ['style-valid'],
	},
	{
		diff: `+function getBalance(account) {
+  return account.balance.toFixed(2)
+}`,
		comment: 'toFixed returns a string — surprising for a function called getBalance.',
		expected: 'correct',
		tags: ['real-bug', 'naming'],
	},
	{
		diff: `+const emails = users.map(u => u.email.toLowerCase())`,
		comment: 'Crashes if any user.email is undefined. Use u.email?.toLowerCase().',
		expected: 'correct',
		tags: ['real-bug'],
	},
	{
		diff: `+app.get('/users', async (req, res) => {
+  const users = await db.users.findAll()
+  res.json(users)
+})`,
		comment: 'No error handling — if db throws, the request hangs and Express never responds.',
		expected: 'correct',
		tags: ['real-bug', 'node'],
	},
	{
		diff: `+const date = new Date('2024-03-15')`,
		comment: 'Date parsing of YYYY-MM-DD strings is timezone-dependent — use a date library.',
		expected: 'correct',
		tags: ['real-bug', 'subtle'],
	},
	{
		diff: `+function getName(user) {
+  return user && user.name
+}`,
		comment: 'Returns the user object instead of name when user is truthy — wait, no, this is fine.',
		expected: 'incorrect',
		tags: ['confused-comment'],
	},
	{
		diff: `+const handler = useCallback(() => {
+  fetch('/api').then(setData)
+}, [setData])`,
		comment: 'setData from useState is stable — you can drop it from the deps array.',
		expected: 'correct',
		tags: ['style-valid', 'react'],
	},
	{
		diff: `+lock.acquire()
+doWork()
+lock.release()`,
		comment: "If doWork throws, the lock is never released. Wrap in try/finally.",
		expected: 'correct',
		tags: ['real-bug', 'concurrency'],
	},
	{
		diff: `+const config = JSON.parse(rawConfig)
+startServer(config)`,
		comment: 'JSON.parse can throw on malformed input — wrap in try/catch.',
		expected: 'correct',
		tags: ['real-bug'],
	},
	{
		diff: `+function clamp(n, min, max) {
+  return Math.min(Math.max(n, min), max)
+}`,
		comment: 'Reverses min and max — should be Math.max(Math.min(n, max), min).',
		expected: 'incorrect',
		tags: ['confused-comment'],
	},
	{
		diff: `+const ids = users.map(u => u.id)
+const unique = [...new Set(ids)]`,
		comment: 'Could do users.map(u => u.id) inside the Set: \`new Set(users.map(u => u.id))\`.',
		expected: 'correct',
		tags: ['style-valid'],
	},
	{
		diff: `+const x = parseInt(input)`,
		comment: 'parseInt without a radix can give surprising results on inputs like "08". Pass 10 as the second arg.',
		expected: 'correct',
		tags: ['real-bug', 'js'],
	},
]

export default defineSuite({
	name: 'code-review',
	description:
		'Code review correctness — given a small diff and a one-line review comment, judge whether the comment is correct (a real, actionable issue) or incorrect (misses the bug, nitpicks something wrong, or is plain wrong).',
	tags: ['code-review', 'classification', 'english'],
	models: [
		'anthropic:claude-haiku-4-5',
		'anthropic:claude-opus-4-7',
		'openai:gpt-5',
		'google:gemini-2.5-pro',
	],
	prompt: ({ input }) => `You are evaluating a code review comment. Read the diff and the comment, then decide whether the comment correctly identifies a real, actionable issue with the code.

Reply with exactly one word — either "correct" or "incorrect" — and nothing else. No punctuation, no explanation.

A comment is "correct" when:
- It identifies a real bug, security issue, or runtime error in the diff
- It points out a meaningful style problem the diff actually has
- Its core claim is true and applies to the code shown

A comment is "incorrect" when:
- It misses an obvious bug in the diff and instead nitpicks something else
- It claims a bug exists but the code is actually fine
- It suggests a change that would break the code or is factually wrong

${input}`,
	concurrency: 5,
	cases: CASES.map((c) => ({
		input: `--- diff ---\n${c.diff}\n\n--- review comment ---\n${c.comment}`,
		expected: c.expected,
		tags: c.tags,
		scorers: [exact({ ignoreCase: true })],
	})),
})
