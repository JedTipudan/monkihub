<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" indent="yes"/>

  <xsl:template match="/logs">
    <div class="xml-output">
      <h3>&#128203; Activity Logs (XSLT Transformed)</h3>

      <!-- Summary counts by action type -->
      <div class="xslt-summary">
        <span>Total Logs: <strong><xsl:value-of select="count(log)"/></strong></span>
        <span>Task Events: <strong><xsl:value-of select="count(log[starts-with(action,'TASK')])"/></strong></span>
        <span>Auth Events: <strong><xsl:value-of select="count(log[starts-with(action,'USER') or starts-with(action,'LOGIN')])"/></strong></span>
        <span>Payment Events: <strong><xsl:value-of select="count(log[starts-with(action,'PAYMENT')])"/></strong></span>
      </div>

      <table class="xslt-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Action</th>
            <th>Actor</th>
            <th>Detail</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          <!-- xsl:sort: most recent first -->
          <xsl:for-each select="log">
            <xsl:sort select="timestamp" order="descending"/>
            <tr>
              <!-- xsl:attribute: color row by action category -->
              <xsl:attribute name="class">
                <xsl:choose>
                  <xsl:when test="action='TASK_APPROVED' or action='TASK_CREATED'">row-done</xsl:when>
                  <xsl:when test="action='TASK_REJECTED'">row-review</xsl:when>
                  <xsl:when test="starts-with(action,'PAYMENT')">row-inprogress</xsl:when>
                  <xsl:otherwise>row-todo</xsl:otherwise>
                </xsl:choose>
              </xsl:attribute>
              <td><xsl:value-of select="@id"/></td>
              <td>
                <!-- xsl:choose: human-readable action labels -->
                <xsl:choose>
                  <xsl:when test="action='TASK_CREATED'">&#128221; Task Created</xsl:when>
                  <xsl:when test="action='TASK_UPDATED'">&#9998; Task Updated</xsl:when>
                  <xsl:when test="action='TASK_APPROVED'">&#10003; Task Approved</xsl:when>
                  <xsl:when test="action='TASK_REJECTED'">&#10007; Task Rejected</xsl:when>
                  <xsl:when test="action='TASK_SUBMITTED'">&#128228; Submitted for Review</xsl:when>
                  <xsl:when test="action='TASK_DELETED'">&#128465; Task Deleted</xsl:when>
                  <xsl:when test="action='PAYMENT_CREATED'">&#128181; Payment Requested</xsl:when>
                  <xsl:when test="action='PAYMENT_PAID'">&#10003; Payment Paid</xsl:when>
                  <xsl:otherwise><xsl:value-of select="action"/></xsl:otherwise>
                </xsl:choose>
              </td>
              <td>@<xsl:value-of select="actor"/></td>
              <td><xsl:value-of select="detail"/></td>
              <td><xsl:value-of select="timestamp"/></td>
            </tr>
          </xsl:for-each>
        </tbody>
      </table>
    </div>
  </xsl:template>

</xsl:stylesheet>
