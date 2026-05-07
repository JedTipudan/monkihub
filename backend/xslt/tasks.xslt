<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" indent="yes"/>
  <xsl:template match="/tasks">
    <div class="xml-output">
      <h3>✅ Tasks (XSLT Transformed)</h3>
      <table class="xslt-table">
        <thead>
          <tr><th>ID</th><th>Title</th><th>Assignee</th><th>Status</th><th>Priority</th></tr>
        </thead>
        <tbody>
          <xsl:for-each select="task">
            <tr>
              <xsl:attribute name="class">status-<xsl:value-of select="status"/></xsl:attribute>
              <td><xsl:value-of select="@id"/></td>
              <td><xsl:value-of select="title"/></td>
              <td><xsl:value-of select="assignee"/></td>
              <td><xsl:value-of select="status"/></td>
              <td><xsl:value-of select="priority"/></td>
            </tr>
          </xsl:for-each>
        </tbody>
      </table>
    </div>
  </xsl:template>
</xsl:stylesheet>
