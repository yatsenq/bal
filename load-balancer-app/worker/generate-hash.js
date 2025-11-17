const bcrypt = require('bcryptjs')

async function generateHash(password) {
	const hash = await bcrypt.hash(password, 10)
	return hash
}

async function main() {
	console.log('Генерація bcrypt хешів...\n')

	const adminHash = await generateHash('admin123')
	console.log('Admin password (admin123):')
	console.log(adminHash)
	console.log('')

	const userHash = await generateHash('user123')
	console.log('User password (user123):')
	console.log(userHash)
	console.log('')

	console.log('Використайте ці хеші в db/init.sql')
}

main().catch(console.error)
