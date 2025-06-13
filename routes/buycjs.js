async function promptBuyCJS(args) {
  if (!args || args.length === 0) {
    console.log('\nWelcome to CJS Pay!');
    console.log('To proceed, you must first be registered.\n');
    console.log('Registration links your user ID to your identity and is required before using the system.\n');

    const registeredUser = await registration.promptRegistration();

    if (!registeredUser) {
      console.log('Registration failed or cancelled. Exiting.');
      process.exit(1);
    }

    console.log('\nRegistration successful. Please enter buy details.\n');

    const buyArgs = await promptUserForBuyArgs();
    if (!buyArgs) {
      console.log('Invalid buy arguments. Exiting.');
      process.exit(1);
    }
    return await processPurchase(buyArgs.userId, buyArgs.amount);
  } else {
    // Proceed directly if args provided
    const userId = args[0];
    const amount = parseFloat(args[1]);
    if (!userId || isNaN(amount) || amount <= 0) {
      throw new Error('Invalid arguments provided to buycjs.');
    }
    return await processPurchase(userId, amount);
  }
}
