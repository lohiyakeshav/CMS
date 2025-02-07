const getTransactionHistory = async (req) => {
  try {
    const result = await pool.query(
      `SELECT t.id, t.amount, t.transaction_type, t.transaction_date, t.status,
              ip.title AS product_title
       FROM transactions t
       JOIN insurance_products ip ON t.product_id = ip.id
       WHERE t.policyholder_id = $1
       ORDER BY t.transaction_date DESC`,
      [req.policyholder.id]
    );
    return result.rows;
  } catch (error) {
    throw new Error('Failed to retrieve transaction history');
  }
}; 